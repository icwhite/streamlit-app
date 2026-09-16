import { Resend } from "resend";
import { db } from "./_lib/firebase-admin.mjs";

const CONCURRENCY = 5;
const BETWEEN_BATCHES_MS = 650;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPendingStudyDay(value) {
  const day = Number(value);
  return Number.isInteger(day) && day >= 2 && day <= 7;
}

function buildMessage({ participantId, day, studyUrl, isTest }) {
  const testPrefix = isTest ? `[TEST for ${participantId}] ` : "";
  const dayDescription =
    day === 7 ? "final comparison session" : "music listening session";

  const subject = `${testPrefix}Music Study — Day ${day} reminder`;

  const text = [
    "Hello,",
    "",
    `This is a reminder that your Day ${day} ${dayDescription} is ready.`,
    "",
    `Open the study: ${studyUrl}`,
    "",
    "If you have already completed this session, you can ignore this message.",
    "",
    "Thank you for participating in the Music Study.",
  ].join("\n");

  const html = `
    <p>Hello,</p>
    <p>
      This is a reminder that your <strong>Day ${day}</strong>
      ${dayDescription} is ready.
    </p>
    <p>
      <a href="${studyUrl}">Open today's Music Study session</a>
    </p>
    <p>
      If you have already completed this session, you can ignore this message.
    </p>
    <p>Thank you for participating in the Music Study.</p>
  `;

  return { subject, text, html };
}

async function sendOneReminder({
  resend,
  from,
  replyTo,
  overrideTo,
  contactRef,
  participantId,
  email,
  currentDay,
  todayUtc,
  studyBaseUrl,
}) {
  const destination = overrideTo || email;
  const studyUrl =
    `${studyBaseUrl}/?pid=${encodeURIComponent(participantId)}`;
  const message = buildMessage({
    participantId,
    day: currentDay,
    studyUrl,
    isTest: Boolean(overrideTo),
  });

  const payload = {
    from,
    to: [destination],
    subject: message.subject,
    text: message.text,
    html: message.html,
    tags: [
      { name: "category", value: "study_reminder" },
      { name: "study_day", value: String(currentDay) },
    ],
  };

  if (replyTo) {
    payload.replyTo = replyTo;
  }

  const { data, error } = await resend.emails.send(payload, {
    idempotencyKey:
      `music-study-${participantId}-day${currentDay}-${todayUtc}`,
  });

  if (error) {
    throw new Error(
      `Resend error for ${participantId}: ${JSON.stringify(error)}`
    );
  }

  if (!overrideTo) {
    await contactRef.set(
      {
        last_reminder_sent_at: new Date().toISOString(),
        last_reminder_date_utc: todayUtc,
        last_reminder_study_day: currentDay,
        last_resend_email_id: data?.id || null,
      },
      { merge: true }
    );
  }

  return {
    participant_id: participantId,
    study_day: currentDay,
    resend_email_id: data?.id || null,
    test_override: Boolean(overrideTo),
  };
}

export default async function handler() {
  const dryRun =
    String(process.env.REMINDER_DRY_RUN || "").toLowerCase() === "true";
  const overrideTo = (process.env.REMINDER_OVERRIDE_TO || "").trim();
  const from = (process.env.REMINDER_FROM_EMAIL || "").trim();
  const replyTo = (process.env.REMINDER_REPLY_TO || "").trim();
  const resendApiKey = (process.env.RESEND_API_KEY || "").trim();

  const studyBaseUrl = (
    process.env.STUDY_BASE_URL ||
    process.env.URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  if (!studyBaseUrl) {
    throw new Error(
      "Missing STUDY_BASE_URL and Netlify URL environment variables."
    );
  }

  if (!dryRun && !resendApiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  if (!dryRun && !from) {
    throw new Error("Missing REMINDER_FROM_EMAIL.");
  }

  const todayUtc = new Date().toISOString().slice(0, 10);

  const contactsSnap = await db
    .collection("participant_contacts")
    .where("reminder_enabled", "==", true)
    .get();

  const eligible = [];

  for (const contactDoc of contactsSnap.docs) {
    const contact = contactDoc.data();

    if (contact.reminder_consent !== true) {
      continue;
    }

    const participantId =
      String(contact.participant_id || contactDoc.id).trim();
    const email = String(contact.email || "").trim();

    if (!participantId || !email) {
      continue;
    }

    if (contact.last_reminder_date_utc === todayUtc) {
      continue;
    }

    const participantSnap = await db
      .collection("participants")
      .doc(participantId)
      .get();

    if (!participantSnap.exists) {
      console.warn(
        `Skipping ${participantId}: participant document missing.`
      );
      continue;
    }

    const participant = participantSnap.data();
    const currentDay = participant.current_day;

    if (!isPendingStudyDay(currentDay)) {
      continue;
    }

    const lastCompletedAt = participant.last_completed_at;
    if (!lastCompletedAt) {
      continue;
    }

    const lastCompletedDateUtc = new Date(lastCompletedAt)
      .toISOString()
      .slice(0, 10);

    if (lastCompletedDateUtc === todayUtc) {
      continue;
    }

    eligible.push({
      contactRef: contactDoc.ref,
      participantId,
      email,
      currentDay: Number(currentDay),
    });
  }

  eligible.sort((a, b) =>
    a.participantId.localeCompare(b.participantId)
  );

  console.log(
    `send-reminders: ${eligible.length} eligible participant(s); ` +
      `dryRun=${dryRun}; override=${Boolean(overrideTo)}`
  );

  if (dryRun) {
    eligible.forEach((item) => {
      console.log(
        `[DRY RUN] Day ${item.currentDay}: ${item.participantId} -> ${item.email}`
      );
    });

    return Response.json({
      dry_run: true,
      eligible_count: eligible.length,
      participants: eligible.map((item) => ({
        participant_id: item.participantId,
        study_day: item.currentDay,
      })),
    });
  }

  const resend = new Resend(resendApiKey);
  const successes = [];
  const failures = [];

  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const chunk = eligible.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      chunk.map((item) =>
        sendOneReminder({
          resend,
          from,
          replyTo,
          overrideTo,
          contactRef: item.contactRef,
          participantId: item.participantId,
          email: item.email,
          currentDay: item.currentDay,
          todayUtc,
          studyBaseUrl,
        })
      )
    );

    results.forEach((result, index) => {
      const item = chunk[index];

      if (result.status === "fulfilled") {
        successes.push(result.value);
      } else {
        const failure = {
          participant_id: item.participantId,
          study_day: item.currentDay,
          error: String(result.reason?.message || result.reason),
        };
        failures.push(failure);
        console.error("Reminder failed:", failure);
      }
    });

    if (i + CONCURRENCY < eligible.length) {
      await sleep(BETWEEN_BATCHES_MS);
    }
  }

  const summary = {
    dry_run: false,
    eligible_count: eligible.length,
    sent_count: successes.length,
    failed_count: failures.length,
    test_override: Boolean(overrideTo),
    failures,
  };

  console.log("send-reminders summary:", summary);
  return Response.json(summary);
}
