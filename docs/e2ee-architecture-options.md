# E2EE Architecture Options & Required Security Review (Stage 1, v1)

Status: PROPOSAL — no architecture is finalized by this document. Library selection alone does NOT settle the design; the review gates in §5 must pass before any E2EE code ships.

## 1. Candidate protocol stacks

| Option | 1:1 | Tribes (10–50) | Client cost | Verdict for UniVerse |
|---|---|---|---|---|
| **A. Signal-style: X3DH + Double Ratchet (1:1), Sender Keys (tribes), WebCrypto + @noble/curves** | PFS + PCS | O(1) per message; re-key on member removal | ~15 KB JS, no WASM | **Recommended baseline** — matches low-end Android PWA constraints |
| B. Same protocols via libsodium.js primitives | same | same | ~300 KB, WASM-ish | Fallback if noble-curves gaps appear; heavier |
| C. MLS (RFC 9420) | strong | O(log N) epochs | ~1.2–2.5 MB WASM, delivery-service ordering | Rejected for now: tribes are small; sequencing is brittle on flaky 3G; ecosystem immature in browser |
| D. Simple WebCrypto ECDH, no ratchet | weak | n/a | tiny | Rejected: no post-compromise security |

Key decisions carried from the completed research report (Oct 13): safety-number verification; PIN → Argon2id (64 MB, t=3) → AES-GCM vault for recovery, with honest re-enrollment fallback (old history stays unreadable); client-side AES-GCM before any attachment upload; generic push bodies with service-worker-side decryption; local IndexedDB search replacing server search; message franking for moderation evidence.

## 2. What the Stage 1 SQL does (and does not) decide

The proposed schema (`sql/proposals/e2ee-stage1-foundation.sql`) is deliberately protocol-agnostic: device directory, public prekey pool, opaque encrypted vault blob, report-evidence table, two nullable message columns. It commits us to none of A–D. It only guarantees the server stores no private key material and no plaintext. If the protocol review changes the key-bundle shape (e.g. MLS key packages instead of OPK pools), the columns change — that is why approval is for the *shape* of least-privilege storage, not for a protocol.

## 3. Message-franking field: security properties

**Provides (only when combined):**
- Sender authenticity for *reported* messages: reporter submits plaintext + franking key; server recomputes the tag — a receiver cannot fabricate a message they never received.
- With the server binding tag (HMAC over tag‖sender‖timestamp with a server-held secret), neither receiver nor a third party can repudiate or transplant a report onto another sender.
- Admins get cryptographic proof of exactly one reported message, without blanket message access.

**Does NOT provide:**
- No confidentiality for the franking tag (it is an HMAC of the plaintext — a low-entropy plaintext like "yes" makes the tag brute-forceable in principle; tags must be treated as metadata).
- No protection if the server-held binding secret leaks AND the attacker holds the tag (they could forge bindings for synthetic messages; the secret must live in Supabase vault, never in PostgREST-readable config).
- No proof of context (screenshots around the message, who else saw it).
- Nothing for legacy plaintext rows (null tag = no claim).
- Binding tag does not make the *reporter* honest — a reporter can still omit exculpatory context; moderation review must treat evidence as partial.

## 4. Open choices requiring review before implementation

1. Binding-signature compute site: DB trigger (vault-stored secret) vs edge function. Tradeoff: trigger = simpler atomicity; edge fn = secret not in DB at all, but adds a write path outside RLS.
2. OPK pool size + consumption semantics (mark `consumed_at` vs hard delete; audit trail favors soft-consume).
3. Vault blob versioning (today `vault_version=1`; migration story if KDF params change).
4. Whether `messages.content` stays as a nullable legacy column or migrates to a new `messages_v2` table at cutover (avoids mixing plaintext/ciphertext rows forever).

## 5. Required security review gates (must pass BEFORE any E2EE client code)

- [ ] **External cryptographic review** of the protocol design doc (not this file): the X3DH/double-ratchet instantiation, key-derivation chain, and franking construction reviewed by someone with applied-crypto credentials. Budget item for the owner.
- [ ] **Test-vector conformance**: double-ratchet test vectors from Signal's spec run against our implementation; noble-curves/ libsodium vectors for the primitives.
- [ ] **Threat-model writeup**: what the Supabase server, a DB leak, a stolen phone, and a malicious admin can each see, before/after.
- [ ] **Self-review checklist**: no custom primitives; keys never in localStorage (IndexedDB non-extractable CryptoKey only); constant-time comparisons where applicable; no plaintext in logs, push, realtime payloads, or error messages.
- [ ] **Rollback drill**: apply Stage 1 SQL to a STAGING project, run `e2ee-stage1-rls-tests.sql`, then run the rollback SQL and verify zero residue. Never drilled on production.

## 6. Unresolved risks

- R6.1: external review cost/timeline unknown (owner decision).
- R6.2: WebPush on low-end Android may not reliably wake the service worker for decryption — push may stay generic ("New message") until verified on-device.
- R6.3: IndexedDB state loss (Android Go storage pressure) forces re-enrollment more often than expected; recovery UX must be tested with real students.
- R6.4: mixing plaintext legacy rows and ciphertext rows in one table during rollout — migration path must be decided before Stage 3.
