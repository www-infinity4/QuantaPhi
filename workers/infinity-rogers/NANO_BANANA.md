# Nano Banana image renderer (opt-in)

The existing QuantaPhi image card sends multipart form data to `POST /v1/image` on the `infinity-rogers` Worker. This change adds an **optional** Google Gemini image-generation provider behind that same route.

## Activate safely

1. Enable Gemini API paid access in your own Google AI Studio / Google API project. **This is separate from the OpenArt ChatGPT connection and may be billed by Google per generated image.**
2. In Cloudflare dashboard, open Workers & Pages → `infinity-rogers` → Settings → Variables and Secrets.
3. Add **secret** `GEMINI_API_KEY` with the API key value; never place it in GitHub, a public Worker variable, browser JavaScript or a chat message.
4. Deploy the updated `workers/infinity-rogers/worker.js` to `infinity-rogers`.
5. Test `/v1/image` from the QuantaPhi image card using a new, original text-only prompt and then an uploaded reference image. Confirm generated pixels appear, then test image review and Save image.

**Without `GEMINI_API_KEY`**, generation remains on the existing Cloudflare FLUX.2 Klein/Dev route. The Cloudflare image reading and review routes are unchanged.

**With `GEMINI_API_KEY`**, image creation uses Google Gemini **Nano Banana 2** model `gemini-3.1-flash-image` via `generateContent`; its base64 image is returned as the same `dataURI` field the existing front end expects. Images are requested at 1K, with modes mapped to suitable aspect ratios. Reference photos and design references remain supported.

Provider failures are explicitly returned to the image card (including authorization, quota, invalid-input, empty-image and timeout cases). The adapter intentionally does **not** silently resubmit moderated/rejected prompts through a different model. A failing Gemini call does not make a fake successful image.

## Before merging/deploying

- JavaScript syntax check on the Worker.
- With the secret absent, confirm the existing FLUX path and reader/reviewer still work.
- With the secret set, verify one 1K text-to-image render, then one reference-based render.
- Inspect Cloudflare logs for errors if the image card reports a failure.

**Billing note:** Google Gemini image-generation API calls can incur charges. Configure provider budget limits before enabling the secret. The existing QuantaPhi credit counter is not a substitute for Google billing controls.
