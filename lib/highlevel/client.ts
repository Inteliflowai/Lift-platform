// Support both v1 (location API key) and v2 (PIT key) formats
const isPIT = process.env.HL_API_KEY?.startsWith("pit-");
const HL_BASE = isPIT
  ? "https://services.leadconnectorhq.com"
  : "https://rest.gohighlevel.com/v1";

function hlHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.HL_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (isPIT) {
    headers["Version"] = "2021-07-28";
  }
  return headers;
}

interface HLContact {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  companyName?: string;
  tags?: string[];
  customField?: Record<string, string>;
  source?: string;
}

export async function upsertHLContact(
  contact: HLContact
): Promise<string | null> {
  if (!process.env.HL_API_KEY) return null;

  try {
    // Search for existing contact by email
    const searchRes = await fetch(
      `${HL_BASE}/contacts/search?query=${encodeURIComponent(contact.email)}`,
      { headers: hlHeaders() }
    );
    const searchData = await searchRes.json();
    const existing = searchData?.contacts?.[0];

    if (existing) {
      await fetch(`${HL_BASE}/contacts/${existing.id}`, {
        method: "PUT",
        headers: hlHeaders(),
        body: JSON.stringify(contact),
      });
      return existing.id;
    } else {
      const createRes = await fetch(`${HL_BASE}/contacts/`, {
        method: "POST",
        headers: hlHeaders(),
        body: JSON.stringify({
          ...contact,
          locationId: process.env.HL_LOCATION_ID,
        }),
      });
      const created = await createRes.json();
      return created?.contact?.id ?? null;
    }
  } catch (err) {
    console.error("HL upsertContact failed:", err);
    return null;
  }
}

export async function addHLTags(
  contactId: string,
  tags: string[]
): Promise<void> {
  if (!process.env.HL_API_KEY) return;
  await fetch(`${HL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: hlHeaders(),
    body: JSON.stringify({ tags }),
  }).catch((err) => console.error("HL addTags failed:", err));
}

export async function removeHLTags(
  contactId: string,
  tags: string[]
): Promise<void> {
  if (!process.env.HL_API_KEY) return;
  await fetch(`${HL_BASE}/contacts/${contactId}/tags`, {
    method: "DELETE",
    headers: hlHeaders(),
    body: JSON.stringify({ tags }),
  }).catch((err) => console.error("HL removeTags failed:", err));
}

export async function moveHLPipelineStage(
  contactId: string,
  stageId: string
): Promise<void> {
  if (!process.env.HL_API_KEY || !stageId) return;

  try {
    // Find existing opportunity for this contact
    const oppsRes = await fetch(
      `${HL_BASE}/opportunities/search?contact_id=${contactId}`,
      { headers: hlHeaders() }
    );
    const oppsData = await oppsRes.json();
    const opp = oppsData?.opportunities?.[0];

    if (opp) {
      await fetch(`${HL_BASE}/opportunities/${opp.id}`, {
        method: "PUT",
        headers: hlHeaders(),
        body: JSON.stringify({ stageId }),
      });
    } else {
      await fetch(`${HL_BASE}/opportunities/`, {
        method: "POST",
        headers: hlHeaders(),
        body: JSON.stringify({
          pipelineId: process.env.HL_PIPELINE_ID,
          locationId: process.env.HL_LOCATION_ID,
          contactId,
          stageId,
          name: "LIFT Subscription",
          status: "open",
        }),
      });
    }
  } catch (err) {
    console.error("HL moveStage failed:", err);
  }
}
