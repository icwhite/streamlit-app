import { db } from "./_lib/firebase-admin.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const participantId =
    typeof body.participant_id === "string"
      ? body.participant_id.trim()
      : "";
  const email =
    typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  const consent = body.reminder_consent === true;

  if (!participantId || participantId.length > 128) {
    return jsonResponse({ error: "Invalid participant ID." }, 400);
  }

  if (!EMAIL_RE.test(email) || email.length > 320) {
    return jsonResponse({ error: "Please enter a valid email address." }, 400);
  }

  if (!consent) {
    return jsonResponse(
      { error: "Reminder email consent is required." },
      400
    );
  }

  try {
    const participantRef = db.collection("participants").doc(participantId);
    const contactRef = db
      .collection("participant_contacts")
      .doc(participantId);

    const [participantSnap, contactSnap] = await Promise.all([
      participantRef.get(),
      contactRef.get(),
    ]);

    if (!participantSnap.exists) {
      return jsonResponse(
        { error: "Participant record does not exist yet." },
        404
      );
    }

    if (contactSnap.exists) {
      const existingEmail = String(contactSnap.data().email || "")
        .trim()
        .toLowerCase();

      if (existingEmail && existingEmail !== email) {
        return jsonResponse(
          {
            error:
              "A different reminder email is already registered for this participant. Please contact the study team to update it.",
          },
          409
        );
      }
    }

    const now = new Date().toISOString();
    const existingCreatedAt = contactSnap.exists
      ? contactSnap.data().created_at || now
      : now;

    await Promise.all([
      contactRef.set(
        {
          participant_id: participantId,
          email,
          reminder_enabled: true,
          reminder_consent: true,
          consent_at: contactSnap.exists
            ? contactSnap.data().consent_at || now
            : now,
          created_at: existingCreatedAt,
          updated_at: now,
        },
        { merge: true }
      ),
      participantRef.set(
        {
          reminder_registered: true,
          reminder_registered_at: now,
        },
        { merge: true }
      ),
    ]);

    return jsonResponse({ registered: true });
  } catch (error) {
    console.error("register-reminder failed:", error);
    return jsonResponse(
      { error: "Could not register reminder email. Please try again." },
      500
    );
  }
}

export const config = {
  path: "/api/register-reminder",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};
