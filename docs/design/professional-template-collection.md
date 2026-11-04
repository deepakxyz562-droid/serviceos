# Professional business template collection

Implemented 12 reference-inspired templates: plumbing, dental, restaurant, fitness, salon, property, coaching, automotive, fashion, physiotherapy, café and Diwali. Find them under **Marketing → Templates → Professional collection** on web and mobile.

## Editable structure

Each saved design contains an independently replaceable background image, business identity, headline, service lines, CTA and contact footer. Contrast panels, service markers and CTA backgrounds are editable shapes. The artwork contains no baked-in marketing copy. Objects inside a photograph are part of that image; replace the photograph to change them.

Select a text layer to edit its content or choose Modern, Editorial or Bold display typography. Select the background photo to upload a replacement and adjust cropping. Existing business branding is passed into the same composition function used by both galleries and exports. Deliberately empty text overrides are preserved.

The designs use separate composition IDs, preserving older template IDs and existing saved documents. Default copy contains no invented discounts, prices, testimonials, credentials or outcome guarantees. Users can add their own confirmed offer using editable text and shapes.

## Asset and font delivery

- Original text-free AI artwork: `public/images/bgos/templates/` (12 WebP images, about 2.1 MB total). Source images were generated for this collection, not taken from the supplied collage.
- Mobile copies: `bgosmobile/assets/poster-templates/`, statically bundled to support offline gallery previews.
- Fonts: existing Geist regular/bold plus DM Serif Display Italic and Anton, bundled identically for web, mobile and server export. Font selection affects the design, not the BGOS interface.
- Upstream font files and licenses: https://github.com/google/fonts/tree/main/ofl/dmserifdisplay and https://github.com/google/fonts/tree/main/ofl/anton. License copies accompany both platform bundles.
- Portable design validation accepts only the restricted `/images/bgos/templates/[a-z0-9-]+.webp` local path format, HTTPS sources or validated uploaded image data. Arbitrary local paths remain rejected.
- Server export decodes approved assets with Sharp before passing PNG bytes to ImageResponse, which cannot directly decode WebP. Tenant-owned uploaded assets retain existing ownership checks.

## Verification

Automated coverage includes all 12 templates at four canvas ratios, independent photo replacement without changing text, empty-copy overrides, local-path rejection, gallery filtering/selection, matching web/mobile bundled image bytes, and real PNG rendering with bundled fonts and artwork. A rendered contact sheet was inspected and the headline hierarchy refined.

Deployment requires shipping the public images/font assets and a rebuilt mobile bundle. Automated checks and server-rendered review are not a substitute for authenticated save/publish checks or physical iOS/Android visual QA. No deployment is performed by adding these files.
