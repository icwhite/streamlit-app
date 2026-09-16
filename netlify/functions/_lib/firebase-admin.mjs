import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;

  if (!encoded) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_B64 environment variable."
    );
  }

  let serviceAccount;
  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    serviceAccount = JSON.parse(json);
  } catch (error) {
    throw new Error(
      `Could not decode FIREBASE_SERVICE_ACCOUNT_B64: ${error.message}`
    );
  }

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_B64 does not contain a valid Firebase service account."
    );
  }

  return serviceAccount;
}

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert(loadServiceAccount()),
  });
}

export const db = getFirestore(getFirebaseApp());
