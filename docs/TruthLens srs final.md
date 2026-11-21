# TruthLens

**Software Requirements Specification** (IEEE 830 inspired format)

AI-Powered Image Forensics, Privacy Analysis and Authenticity Assessment System

Version 2.0 · November 2026 · Revised final draft for academic submission

Submitted in partial fulfilment of the requirements for the degree of Bachelor of Computer Applications (BCA). Final Year Project Report.

## Revision History

| Version | Date | Author | Description of change |
| --- | --- | --- | --- |
| 0.1 | Month 1 | Project Author | Initial draft: problem statement, feature list, technology stack |
| 0.2 | Month 2 | Project Author | System architecture, module decomposition, use cases |
| 0.3 | Month 4 | Project Author | Functional requirements for all engines; non-functional requirements |
| 0.4 | Month 6 | Project Author | Kerala regional evidence engine; research foundation |
| 0.5 | Month 8 | Project Author / Guide Review | Scoring methodology refined; risk analysis and limitations added |
| 1.0 | Month 9 | Project Author | Consolidated version for submission and viva-voce |
| 2.0 | Nov 2026 | Project Author | Scoring formulas defined in full (Section 6); shared-image handling added (Sections 5.12 and 7); Probable Region engine deferred to Future Scope; screen-to-data mapping and implementation plan added; broken cross-references corrected |

Note on scope: this document is a living artefact. Any change to a requirement must be logged in this table with an incremented version number.

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the functional and non-functional requirements of TruthLens, a web-based image forensics, privacy analysis and authenticity assessment platform. It is the single source of truth for what the system must do, how it must behave and the constraints it works under.

It serves three groups: the student developer, who turns the requirements into working code; the project guide, who checks technical soundness and feasibility; and the examination panel, who assess the final system against a written baseline. Where a requirement is ambiguous, that is a defect in this document.

The document is also a design contract. Every functional requirement in Section 5 traces to a feature in Section 1.2, and every score the system shows is defined exactly, with its formula, in Section 6.

### 1.2 Scope

TruthLens is a single web application that accepts an uploaded image and returns a structured forensic report.

#### 1.2.1 In scope

- Extraction and interpretation of EXIF and related metadata.
- Optical character recognition (OCR) of visible text and identification of personally identifiable information (PII) in that text.
- Detection of privacy-sensitive visual objects: faces, vehicle number plates, QR codes and identity documents.
- Error Level Analysis (ELA) and compression checks for tamper screening.
- A lightweight AI-generated-content likelihood estimate that combines a HuggingFace classifier with metadata, ELA and OCR signals.
- A composite Authenticity Score and a separate Privacy Risk Score, each with a plain-language explanation of its contributing evidence.
- Detection of images that were shared through social or messaging apps, and automatic adjustment of the affected checks (Section 7).
- An image sanitization pipeline that removes metadata and blurs sensitive regions, available only after analysis is complete.
- A real-time progress display driven by Server-Sent Events (SSE).
- Generation and download of a forensic report.

#### 1.2.2 Out of scope

- Legal or court-admissible certification of authenticity. TruthLens gives probabilistic assessments, not legal verdicts.
- Video, audio or multi-frame deepfake analysis. Only static JPEG, PNG and WEBP images are processed.
- Live GPS tracking or geolocation.
- Chain-of-custody workflows and integration with forensic databases.
- Native mobile applications.
- Inference of a probable region of origin (the Kerala Regional Evidence Engine). It is deferred to Future Scope (Section 17); the interface card for it is a placeholder and does not affect any score.
- Recovery of metadata or compression history that a sharing app has already removed.

### 1.3 Objectives

1. Build a modular pipeline in which each engine (metadata, OCR, privacy, forensics, AI assessment) can run, fail and be evaluated independently.
2. Produce an Authenticity Score whose contributing evidence is explainable to a non-expert user, avoiding a black-box verdict.
3. Detect privacy-sensitive content before an image is shared and provide a one-click sanitization path.
4. Handle images that were already shared through social apps honestly: detect the situation, lower the weight of checks that no longer work, and tell the user.
5. Give a responsive experience through live progress updates.
6. Define every formula openly and measure real accuracy on a labelled test set.
7. Complete the system within the limits of a single-student, 10-month BCA project using only open-source and free-tier technology.

### 1.4 Intended Audience

| Audience | Use of this document |
| --- | --- |
| Student developer (author) | Implementation reference: requirements, module boundaries, formulas and acceptance criteria |
| Project guide | Milestone evaluation and feasibility review |
| External examiners / viva panel | Evaluation reference and basis for questions on design rationale |
| Future maintainers | Onboarding if the project is extended |

### 1.5 Definitions

| Term | Definition |
| --- | --- |
| Authenticity Score (A) | Score from 0 to 100 where higher means the image looks more authentic. Built from the Forensic Suspicion, AI Probability, Metadata Risk and OCR Consistency scores (Section 6.7) |
| Forensic Suspicion Score (F) | Score from 0 to 100 from ELA and compression analysis; higher means more signs of manipulation. Shown on screen as Manipulation signs |
| AI Probability Score (P\_AI) | Score from 0 to 100 combining a classifier and supporting clues; higher means more likely AI-generated |
| Metadata Risk Score (M) | Score from 0 to 100 from warning signs in the file's metadata |
| OCR Consistency Score (O) | Score from 0 to 100 showing how much of the recognised text looks like nonsense |
| Privacy Risk Score (R) | Score from 0 to 100 for how much sensitive information the image exposes |
| Shared-Image Flag | A yes/no finding that the image was probably re-compressed by a sharing app (Section 7) |
| Reliability factor (r) | Multiplier (1, 0.5 or 0) applied to an engine's weight when its result is normal, weak or unavailable |
| Probabilistic assessment | An output with a score or confidence level instead of a yes/no verdict |
| Sanitized image | An output image with metadata removed and sensitive regions blurred |

### 1.6 Acronyms

| Acronym | Expansion |
| --- | --- |
| SRS | Software Requirements Specification |
| EXIF | Exchangeable Image File Format |
| OCR | Optical Character Recognition |
| ELA | Error Level Analysis |
| PII | Personally Identifiable Information |
| SSE | Server-Sent Events |
| FR / NFR | Functional / Non-Functional Requirement |
| YOLO | You Only Look Once (object detection architecture) |
| PAN | Permanent Account Number |
| Aadhaar | Indian national identity number |
| GDPR | General Data Protection Regulation |

---

## 2. Overall Description

### 2.1 Product Perspective

TruthLens is a new, self-contained product made of three units: a Next.js/TypeScript frontend, a FastAPI/Python backend with a REST and SSE API, and a MongoDB Atlas data store. The backend calls computer-vision and NLP libraries (OpenCV, Tesseract OCR, YOLOv8 Nano, ExifTool and HuggingFace models) as in-process or subprocess calls rather than as separate services, which keeps the deployment small enough for one developer.

Its contribution is an explainable fusion of standard forensic signals with a privacy-sanitization workflow that most forensic tools do not provide, and an honest treatment of images that social apps have already stripped.

### 2.2 Product Functions

- Accept an uploaded image and validate format, size and integrity.
- Extract and present EXIF and embedded metadata.
- Run OCR and classify the extracted text into sensitive categories.
- Detect faces, plates, QR codes and identity documents.
- Compute ELA and compression-consistency indicators.
- Estimate the likelihood that the image is AI-generated.
- Detect images shared through sharing apps and adjust the checks.
- Combine the results into an Authenticity Score and a Privacy Risk Score.
- Stream live progress to the frontend.
- Sanitize the image on request, after analysis.
- Generate a downloadable report.

### 2.3 User Classes

| User class | Characteristics | Frequency |
| --- | --- | --- |
| General public | Non-technical; wants to know what an image reveals before posting it | Occasional |
| Student / researcher | Studies forensics or computer vision; inspects example images | Repeated |
| Journalist / fact-checker | Needs a fast, evidence-based first read; understands it is not a legal verdict | Occasional |
| Project evaluator | Assesses correctness and engineering quality | One-time |
| System administrator | Maintains the Docker deployment and database | Periodic |

### 2.4 Operating Environment

- Client: any modern browser that supports EventSource (SSE) and ES2020.
- Frontend: Next.js, TypeScript, Tailwind CSS.
- Backend: Python 3.11+, FastAPI, Uvicorn/Gunicorn inside Docker.
- Libraries: OpenCV, Tesseract OCR (English and Malayalam packs), YOLOv8 Nano weights, ExifTool, HuggingFace Transformers.
- Database: MongoDB Atlas (free or shared tier is enough).
- Deployment: one Linux server or a local Docker host, using Docker Compose.

### 2.5 Constraints

- One developer and about 10 months, which rules out heavy models.
- Models must run on ordinary CPU hardware.
- Outputs must never be presented as legal proof; the disclaimer in Section 14.2 must appear in the interface and in every report.
- Only open-source or freely licensed software and models.
- MongoDB Atlas free-tier limits cap how much data can be kept.
- OCR is tuned for English and Malayalam only.

### 2.6 Assumptions and Dependencies

- Uploaded images are ordinary user uploads; basic input validation is a sufficient defence for an academic threat model.
- Tesseract's Malayalam pack gives adequate but imperfect recognition.
- The detection models will reach reasonable but not perfect precision and recall on a modest custom dataset, and this will be reported honestly.
- The starting weights in Section 6 are reasoned estimates. They are adjusted after testing (Section 6.10).
- The project depends on the continued availability of OpenCV, Tesseract, Ultralytics YOLOv8, ExifTool and HuggingFace Transformers under their current licences.

---

## 3. System Architecture

### 3.1 Architectural Style

TruthLens is a layered monolith. One FastAPI backend contains an independent module (engine) for each capability, and an orchestration layer runs the engines and streams progress through SSE. Microservices would add operational cost that a one-person project cannot justify, but each engine keeps a clear input and output contract so it could be moved into its own service later.

### 3.2 High-Level Diagram

```
Browser (Next.js, TypeScript, Tailwind)
   |  upload, report, sanitize (REST)      ^  progress (SSE)
   v                                       |
FastAPI backend (Python, Docker)
   API gateway -> Orchestration layer
                    |
   +--------+--------+---------+-----------+--------------+
   |        |        |         |           |
 Metadata  OCR    Privacy   Forensics   AI assessment
 engine   engine   engine    engine      module
   +--------+--------+---------+-----------+
                    |
          Authenticity scoring -> Report generator
                    |
          Sanitization (only after the report exists)
                    |
          MongoDB Atlas + file storage
```

### 3.3 Component Responsibilities

| Component | Responsibility |
| --- | --- |
| API gateway | Receives requests, validates file type and size, routes to the orchestration layer, returns synchronous responses |
| Orchestration layer | Runs the engines (in parallel where they do not depend on each other), emits SSE progress events, collects results into one analysis context, marks failed engines as unavailable |
| Metadata engine | Wraps ExifTool; extracts EXIF, IPTC and XMP fields; computes the Metadata Risk Score and the Shared-Image Flag |
| OCR and text engine | Wraps Tesseract (English and Malayalam); finds phone numbers, emails, names, addresses and vehicle numbers; computes the OCR Consistency Score |
| Privacy engine | Runs detection for faces, plates, QR codes and identity documents; computes the Privacy Risk Score |
| Forensics engine | Computes ELA, block statistics and JPEG quantization checks; computes the Forensic Suspicion Score and the ELA heat map |
| AI assessment module | Combines classifier output with metadata, ELA and OCR clues into the AI Probability Score and its confidence |
| Authenticity scoring engine | Applies the formulas in Section 6.7 to produce the Authenticity Score, risk level and confidence level |
| Sanitization engine | Strips metadata with ExifTool and blurs sensitive regions with OpenCV; allowed only after the report exists |
| Report generator | Assembles all outputs into a JSON report and a rendered HTML/PDF report |
| MongoDB Atlas | Stores sessions, results, reports and a minimal audit log; raw images are not kept beyond the retention window |

### 3.4 Data Flow Summary

1. The user uploads an image; the frontend sends a multipart POST request to the backend.
2. The gateway validates the file and creates a session record.
3. The frontend opens an SSE connection to the stream endpoint for that session.
4. The Metadata, OCR and Privacy engines run (they do not depend on each other) and each emits an SSE event when it finishes.
5. The Forensics engine and AI assessment module run next, using the metadata and OCR results and the Shared-Image Flag.
6. The scoring engine computes the Authenticity Score and the Privacy Risk Score.
7. The report generator builds the report and the final event `report_ready` is sent.
8. If the user asks for sanitization, the sanitization engine runs separately and only after step 7.

---

## 4. Use Cases

Actors: the **end user** (uploads images), the **system administrator** (deployment and logs) and **external tooling** (ExifTool, Tesseract, YOLOv8 and the HuggingFace runtime).

| ID | Use case | Precondition | Result | Alternate flow |
| --- | --- | --- | --- | --- |
| UC-1 | Upload image | File is JPEG, PNG or WEBP and within the size limit (default 15 MB) | A session exists and analysis starts automatically | Client-side validation fails: inline error, nothing sent. Server-side validation fails: HTTP 422 with a clear message |
| UC-2 | Analyze image | UC-1 completed | All engines run; sub-scores and the Authenticity Score are stored | An engine fails: it is logged and marked unavailable, its weight is removed (Section 6.7) and the pipeline continues |
| UC-3 | View live progress | UC-2 started | The dashboard updates as each stage finishes | SSE connection drops: the frontend polls the status endpoint every 3 seconds |
| UC-4 | Generate report | UC-2 completed | A JSON and an HTML/PDF report are stored | A required field is missing: a partial report flagged as incomplete is produced |
| UC-5 | Sanitize image | UC-4 completed for the session | Metadata removed; faces, plates and QR codes blurred; summary returned | Requested before UC-4: rejected with HTTP 409, because sanitizing first would destroy evidence |
| UC-6 | Download results | UC-4 and/or UC-5 completed | Report and/or sanitized image downloaded | Artifact missing: the download button is disabled |
| UC-7 | Monitor system (administrator) | Deployment running | Health and logs reviewed | None |

UC-2 starts automatically after UC-1 and includes the analysis engines. UC-3 extends UC-2 and is on by default. UC-4 depends on UC-2. UC-5 depends on UC-4, and this is enforced by the orchestration layer, not left to the interface. UC-6 retrieves the output of UC-4, UC-5 or both.

---

## 5. Functional Requirements

Each requirement is written to be independently testable. FR identifiers are stable and are never renumbered; a retired ID is not reused. The number in an FR ID (for example FR-3.x) names the engine and is separate from the section number.

### 5.1 Image Upload and Validation (FR-1.x)

| FR ID | Requirement |
| --- | --- |
| FR-1.1 | The system shall accept image uploads in JPEG, PNG and WEBP formats. |
| FR-1.2 | The system shall reject uploads above a configurable maximum size (default 15 MB) with a clear error message. |
| FR-1.3 | The system shall verify on the server that the file's real content matches its declared type, to block disguised uploads. |
| FR-1.4 | The system shall create a unique session identifier for each upload and link every later result to it. |
| FR-1.5 | The system shall reject corrupted or unreadable files with HTTP 422 and a human-readable explanation. |

### 5.2 Metadata Analysis Engine (FR-2.x)

| FR ID | Requirement |
| --- | --- |
| FR-2.1 | The system shall extract all available EXIF, IPTC and XMP fields using ExifTool. |
| FR-2.2 | The system shall show the camera make and model if present. |
| FR-2.3 | The system shall extract embedded GPS coordinates and present them as raw evidence, not as a live tracking feature. |
| FR-2.4 | The system shall detect editing software signatures (for example Adobe Photoshop, GIMP, Snapseed) and AI-generator names in metadata fields. |
| FR-2.5 | The system shall compare the original capture time with the file modification time and flag large inconsistencies. |
| FR-2.6 | The system shall report resolution, colour profile and compression parameters. |
| FR-2.7 | The system shall produce a set of metadata findings (for example GPS present, editing software detected, metadata absent) with a plain-language meaning for each. |
| FR-2.8 | If no EXIF metadata is present, the system shall report it as a finding (metadata absent or stripped). When the Shared-Image Flag is set, the finding shall say the metadata was probably removed by a sharing app and shall not be treated as evidence of tampering. |
| FR-2.9 | The system shall compute the Metadata Risk Score (M) as defined in Section 6.3. |

### 5.3 OCR and Text Analysis Engine (FR-3.x)

| FR ID | Requirement |
| --- | --- |
| FR-3.1 | The system shall run Tesseract OCR over the whole image in English and Malayalam modes. |
| FR-3.2 | The system shall extract all recognisable text with a bounding box for each text region. |
| FR-3.3 | The system shall use pattern rules to identify probable personal names. |
| FR-3.4 | The system shall identify probable postal addresses using address-pattern heuristics. |
| FR-3.5 | The system shall detect email addresses using standard email patterns. |
| FR-3.6 | The system shall detect Indian phone numbers (10-digit mobile numbers, with or without the +91 prefix). |
| FR-3.7 | Retired (place-name matching belonged to the deferred regional engine). |
| FR-3.8 | The system shall detect Indian vehicle registration numbers (two letters, two digits, one to two letters, four digits). |
| FR-3.9 | The system shall compile all sensitive findings into one list, each tagged with its category (name, address, email, phone, vehicle number) and bounding box. Sensitive values shall be masked in the display (for example a phone number shown as +91 98••• ••43). |
| FR-3.10 | The system shall record OCR confidence per region and shall mark any finding below a configurable threshold (default 60%) as low confidence. |
| FR-3.11 | The system shall compute the OCR Consistency Score (O) as defined in Section 6.5. |

### 5.4 Privacy Risk Assessment Engine (FR-4.x)

| FR ID | Requirement |
| --- | --- |
| FR-4.1 | The system shall detect human faces and return bounding boxes with confidence. |
| FR-4.2 | The system shall detect vehicle number plates and return bounding boxes, linked to the OCR text of FR-3.8 where they overlap. A plate counted by detection and by OCR shall count once. |
| FR-4.3 | The system shall detect QR codes. |
| FR-4.4 | The system shall detect Aadhaar-like and PAN-like identity documents from their visual layout (colour bands, logo position, aspect ratio) and flag them. |
| FR-4.5 | The system shall detect generic certificate-like documents and flag them as sensitive. |
| FR-4.6 | The system shall compute the Privacy Risk Score (R) on a scale of 0 to 100 using the formula in Section 6.8. |
| FR-4.7 | The system shall classify R into bands: Low (0-30), Moderate (31-60), High (61-85) and Critical (86-100). |
| FR-4.8 | The system shall list every detected sensitive object with its class, bounding box and confidence. |
| FR-4.9 | The system shall count GPS coordinates found in metadata as one privacy item in R. |

### 5.5 Image Sanitization Engine (FR-5.x)

| FR ID | Requirement |
| --- | --- |
| FR-5.1 | The system shall strip all EXIF, IPTC and XMP metadata from the sanitized output using ExifTool. |
| FR-5.2 | The system shall guarantee removal of GPS fields, including edge cases such as GPS data inside maker notes. |
| FR-5.3 | The system shall apply Gaussian blur to every face box, with a blur size proportional to the face size. |
| FR-5.4 | The system shall blur or pixelate every vehicle number plate box. |
| FR-5.5 | The system shall blur or fully redact every QR code. |
| FR-5.6 | The system shall produce a Sanitization Summary listing every change made, by category and count. |
| FR-5.7 | The system shall enforce, at the orchestration level, that sanitization cannot run until the report for the same session is complete. |
| FR-5.8 | The system shall keep the original image unchanged as the basis of the report and output the sanitized image only as a separate derived file. |

### 5.6 Image Forensics Engine (FR-6.x)

| FR ID | Requirement |
| --- | --- |
| FR-6.1 | The system shall compute an ELA map by re-saving the image at a known JPEG quality (default 90) and taking the per-pixel absolute difference from the original. |
| FR-6.2 | The system shall divide the ELA map into blocks and flag blocks whose error is unusually high compared with the rest of the image, as candidate edited regions. |
| FR-6.3 | The system shall analyse JPEG quantization tables and flag signs of more than one compression generation. |
| FR-6.4 | The system shall cross-check forensic findings against metadata findings and show any contradiction explicitly. |
| FR-6.5 | The system shall compute the Forensic Suspicion Score (F) as defined in Section 6.4. |
| FR-6.6 | The system shall provide the ELA map as a viewable and downloadable image beside the score, so a person can inspect it and not rely on the number alone. |

### 5.7 AI-Generated Content Assessment Module (FR-7.x)

| FR ID | Requirement |
| --- | --- |
| FR-7.1 | The system shall run a lightweight HuggingFace image classifier for AI-generated images and record its output as the base classifier probability. |
| FR-7.2 | The system shall use metadata evidence as a supporting or opposing clue (AI-generator name or missing camera data raises the likelihood; consistent camera EXIF lowers it). |
| FR-7.3 | The system shall use the ELA result as a supporting clue, since many AI images show unusually flat error levels without camera sensor noise. |
| FR-7.4 | The system shall use OCR abnormality (garbled or meaningless text) as a supporting clue. |
| FR-7.5 | The system shall compute the AI Probability Score (P\_AI) and a Confidence Level (Low, Medium or High) as defined in Section 6.6. |
| FR-7.6 | The system shall never show the result as a yes or no label. Every screen and report shall keep the probabilistic framing. |

### 5.8 Probable Region Engine (FR-8.x) - deferred

FR-8.1 to FR-8.9 (the Kerala Regional Evidence Analysis Engine) are deferred to Future Scope (Section 17). Their IDs are retired and not reused. The Probable Region card in the interface is a placeholder and takes no part in any score.

### 5.9 Authenticity Scoring Engine (FR-9.x)

| FR ID | Requirement |
| --- | --- |
| FR-9.1 | The system shall compute the Authenticity Score (A) from the Forensic Suspicion, AI Probability, Metadata Risk and OCR Consistency scores using the formula in Section 6.7. |
| FR-9.2 | The system shall use the starting weights in Section 6.7 and shall keep all weights and thresholds in one configuration file, so they can be changed after tuning without a code change. |
| FR-9.3 | The system shall classify A into a risk level: Likely Authentic (76-100), Low Concern (51-75), Moderate Concern (26-50) and High Concern (0-25). |
| FR-9.4 | The system shall compute an overall Confidence Level (Low, Medium or High) from how many engines returned normal-reliability, high-confidence results. |
| FR-9.5 | The system shall list, for every score, the contributing findings and each engine's contribution, so the score is explainable. |
| FR-9.6 | The system shall never present any score as a legal or absolute verdict. The disclaimer in Section 14.2 shall appear with every score. |
| FR-9.7 | If an engine is unavailable, the system shall remove its weight, recompute from the remaining engines and state in the report which engine was unavailable. |
| FR-9.8 | The Privacy Risk Score shall be reported separately and shall not be part of the Authenticity Score. |

### 5.10 Real-Time Dashboard and SSE (FR-10.x)

| FR ID | Requirement |
| --- | --- |
| FR-10.1 | The system shall expose an SSE endpoint that sends one named event per finished stage, in order: upload\_received, metadata\_done, ocr\_done, privacy\_done, forensics\_done, ai\_assessment\_done, scoring\_done, report\_ready. An error event is sent if the pipeline fails. |
| FR-10.2 | Each event shall carry a stage name, a timestamp and a short message that can be shown directly. |
| FR-10.3 | The frontend shall show an updating progress display without a page reload. |
| FR-10.4 | The system shall provide a polling endpoint for clients that cannot use SSE. |
| FR-10.5 | The system shall close the SSE connection after report\_ready or after a configurable maximum duration (default 120 seconds). |

### 5.11 Forensic Report Generator (FR-11.x)

| FR ID | Requirement |
| --- | --- |
| FR-11.1 | The system shall assemble one report with: Metadata Findings, OCR Findings, Privacy Findings, Forensic Findings, AI Assessment, Authenticity Assessment and Recommendations. |
| FR-11.2 | The system shall produce plain-language recommendations, for example: this image shows a number plate and unblurred faces; sanitize before sharing. A GPS finding shall produce a recommendation to remove metadata. |
| FR-11.3 | The system shall offer the report as JSON and as a rendered HTML page that can be exported to PDF. |
| FR-11.4 | The system shall store the report in MongoDB Atlas with its session ID for the retention period. |
| FR-11.5 | The system shall show the disclaimer prominently at the top of every report. |

### 5.12 Shared-Image Handling (FR-12.x)

| FR ID | Requirement |
| --- | --- |
| FR-12.1 | The system shall evaluate the Shared-Image Flag for every upload using the rule in Section 7.2. |
| FR-12.2 | When the flag is set, the system shall apply the changes listed in Section 7.3 to the Metadata, Forensics and AI scoring. |
| FR-12.3 | When the flag is set, the system shall show a notice to the user (Section 7.4) and lower the overall Confidence Level accordingly. |
| FR-12.4 | The system shall never treat missing metadata caused by sharing as evidence of manipulation or of AI generation. |
| FR-12.5 | The system shall record the flag and the signals that triggered it in the report, so the decision can be checked. |

---

## 6. Scoring Methodology

This section defines every score the system shows: what it measures, the exact formula, and the reasoning behind it. All starting weights and thresholds are reasoned estimates and are adjusted after testing (Section 6.10).

### 6.1 Design Approach

The scoring was designed in five steps.

1. **One question per engine.** Metadata asks whether the file history looks normal. Forensics asks whether parts of the image behave differently when re-saved. The AI module asks whether the picture looks machine-made. OCR asks whether the text is sensible.
2. **One common scale.** Each engine gives a sub-score from 0 to 100 where higher means more suspicious. Without a common scale the engines cannot be combined.
3. **The simplest method that can be explained.** A weighted average for the Authenticity Score, added points for yes/no findings, and a probabilistic OR for counting sensitive items. Every contribution can be shown on screen (FR-9.5).
4. **Starting weights by reliability.** Checks that look at pixels (ELA, the classifier) are harder to fake than metadata, which is easy to remove or change. Published work on image forensics and AI-image detection also shows that ELA and single classifiers are only hints. The weights follow this.
5. **Tuning on labelled test images.** The weights and thresholds are adjusted on real, edited and AI-generated test images, and accuracy is reported honestly (Sections 6.10 and 15).

The scores are risk indicators. They are not calibrated probabilities and not legal proof.

### 6.2 Conventions

- Every sub-score runs from 0 to 100, where **higher means more suspicious or more risk**.
- The final **Authenticity Score runs the other way: higher means more authentic**.
- Letters such as `s`, `p`, `c` and `E_score` are fractions from 0 to 1, multiplied by 100 at the end.
- An engine that cannot run, or has nothing to analyse, is marked unavailable. It is never counted as zero.

### 6.3 Metadata Risk Score (M)

`M = min(100, sum of the points of all findings that apply)`

| Finding | Points | Reasoning |
| --- | --- | --- |
| AI-generator name found in any metadata field (Stable Diffusion, Midjourney, DALL-E, etc.) | +60 | Strongest metadata evidence of generation |
| Editing software found (Photoshop, GIMP, Snapseed, etc.) | +40 | Shows the file passed through an editor; not necessarily harmful |
| Capture time and file modification time disagree by a large margin | +20 | Can indicate re-saving or tampering |
| Metadata completely absent (not added when the Shared-Image Flag is set) | +15 | Weak evidence, because sharing apps remove metadata from genuine photos |
| Some EXIF present but camera make or model missing | +10 | Minor irregularity |
| Full, consistent camera EXIF present | 0 | Normal for a camera original |

GPS coordinates are not counted in M. A GPS tag does not make an image fake; it is a privacy finding and is counted in R (Section 6.8).

### 6.4 Forensic Suspicion Score (F)

**What ELA does.** Untouched parts of a JPEG change by about the same amount each time the file is saved. An edited or pasted part often changes by a different amount. ELA saves the image again at a known quality and measures where the change is unusual.

1. Save the image again at quality 90 and compute `ELA(x, y) = | Original(x, y) - Resaved(x, y) |` for every pixel. This map is the ELA heat map.
2. Divide the map into 16x16-pixel blocks and take each block's average error. Let `mu` be the mean and `sigma` the standard deviation of the block averages.
3. A block is unusual if its average error is greater than `mu + 2 x sigma`. Let `E` be the fraction of unusual blocks.
4. `E_score = min(1, E / 0.10)`. If 10% or more of the blocks are unusual the signal is at its maximum. The 10% value is a starting threshold.

`F = 100 x ( 0.5 x E_score + 0.3 x Q + 0.2 x X )`

- `Q` is 1 if the quantization tables show more than one compression generation, otherwise 0.
- `X` is 1 if forensic and metadata findings contradict each other (FR-6.4), otherwise 0.

**Why these weights.** Unusual blocks are the main evidence of local editing (0.5). Double compression is useful, but many innocent images are re-saved when shared (0.3). A contradiction is a supporting hint (0.2).

**Limits.** ELA is weak on PNG and on JPEGs saved only once. In those cases, and when the Shared-Image Flag is set, the engine's reliability factor is 0.5 (Section 6.7).

### 6.5 OCR Consistency Score (O)

For every recognised word: it is valid if it is a dictionary word (English or Malayalam), matches a known pattern (phone number, vehicle number, number) or has OCR confidence of 60% or higher. Otherwise it is invalid.

`O = 100 x (invalid words) / (total words)`

If fewer than 5 words are recognised, the OCR consistency check is unavailable. An image without text must not be treated as suspicious.

### 6.6 AI Probability Score (P\_AI)

Four clues, each from 0 to 1:

| Clue | Meaning | How it is set |
| --- | --- | --- |
| `p_cls` | HuggingFace classifier | The model's AI-generated probability |
| `s_meta` | Metadata clue | 1.0 if an AI-generator name is found; 0.6 if there is no camera EXIF at all; 0.3 if the Shared-Image Flag is set (neutral, because missing data is expected); 0.2 if EXIF is partial; 0.0 if full consistent camera EXIF is present |
| `s_ELA` | Unusually flat error level | `max(0, 1 - sigma / sigma_ref)`, where `sigma_ref` is the typical ELA spread of real camera photos in the test set. Very flat error means no camera sensor noise |
| `s_OCR` | Garbled text | `O / 100`; left out if the OCR check is unavailable |

`P_AI = 100 x ( 0.50 x p_cls + 0.20 x s_meta + 0.20 x s_ELA + 0.10 x s_OCR )`

If a clue is unavailable it is dropped and the remaining weights are divided by their sum.

**Why these weights.** The classifier is the only clue that looks at the picture itself, so it gets half. Published studies show that such classifiers fail on generators they have not seen, so they must not decide alone. The other three clues support or contradict them.

**AI Confidence Level.** High: at least three clues available and the highest and lowest clue differ by less than 0.3. Medium: at least two clues, or partly disagreeing clues. Low: only the classifier is available, or the clues strongly disagree.

The interface shows the percentage and the confidence level, never AI yes or no (FR-7.6).

### 6.7 Authenticity Score (A)

**Inputs** (all 0 to 100, higher = more suspicious):

| Symbol | Source | Starting weight |
| --- | --- | --- |
| F | Forensic Suspicion Score (6.4), shown as Manipulation signs | 0.35 |
| P\_AI | AI Probability Score (6.6), shown as AI-generated likelihood | 0.30 |
| M | Metadata Risk Score (6.3) | 0.20 |
| O | OCR Consistency Score (6.5) | 0.15 |

The weights add up to 1.00. The privacy score is not part of this sum (FR-9.8).

**Reliability factor.** Each engine has a factor `r` that scales its weight:

| r | When it applies |
| --- | --- |
| 1 | The engine ran normally |
| 0.5 | The result is known to be weak: Forensics on a PNG or when the Shared-Image Flag is set; Metadata when the Shared-Image Flag is set; AI module when only the classifier, or only the clues, ran |
| 0 | The engine failed, or had nothing to analyse (for example OCR with fewer than 5 words) |

The effective weight is `w_eff = r x w`.

`Suspicion = ( sum of w_eff x score ) / ( sum of w_eff )`

`A = 100 - Suspicion`

Dividing by the sum of the effective weights means the score still works when an engine fails or is weak (UC-2, FR-9.7). If the sum is zero, no score is given and the report says there was not enough evidence.

**Risk levels (FR-9.3):**

| Authenticity Score A | Risk level |
| --- | --- |
| 76 to 100 | Likely Authentic |
| 51 to 75 | Low Concern |
| 26 to 50 | Moderate Concern |
| 0 to 25 | High Concern |

**Overall Confidence Level.**

`C = ( sum of the original weights of engines with r = 1 and a high-confidence result ) / ( sum of all four original weights )`

High: C is 0.8 or more. Medium: from 0.5 up to 0.8. Low: below 0.5.

**Explainability (FR-9.5).** The report lists each engine's contribution, `w_eff x score / sum of w_eff`, so the user sees what raised or lowered the score.

### 6.8 Privacy Risk Score (R)

R counts sensitive items. A plain sum could pass 100 and a plain average would punish images with many findings, so a probabilistic OR is used. If each item independently has a chance `p` of being a real problem, the chance that at least one is real is `1 - (1 - p1) x (1 - p2) x ...`.

Each detected item `i` has a severity `sev_i` (how bad it is to expose) and a detection confidence `c_i`.

`R = 100 x [ 1 - product of ( 1 - sev_i x c_i ) ]`

| Detected item | Severity |
| --- | --- |
| Aadhaar, PAN or other identity document | 0.90 |
| GPS coordinates in metadata | 0.70 |
| Postal address (OCR) | 0.60 |
| Face | 0.60 |
| Vehicle number plate | 0.50 |
| Phone number (OCR) | 0.40 |
| Email address (OCR) | 0.40 |
| Person name (OCR) | 0.30 |
| Certificate-like document | 0.30 |
| QR code | 0.30 |

A plate found by detection and by OCR counts once. R is classified into the bands of FR-4.7. The score rises fast: several sensitive items give a value near 100. This is intended, since Critical means sanitize before sharing. Detectors can miss items, so thresholds are set to flag rather than miss (Section 13).

### 6.9 Worked Examples

**Example 1: the demonstration image.** A photo with clean Xiaomi camera metadata and embedded GPS, two faces, a number plate, a QR code, an ID-like card and a clean ELA result.

- Metadata: no AI tool, no editor, camera present, times match: `M = 0`.
- Forensics: 4.8% unusual blocks gives `E_score = 0.48`; `Q = 0`, `X = 0`. `F = 100 x 0.5 x 0.48 = 24`.
- OCR: 1 of 20 words invalid: `O = 5`.
- AI: `p_cls = 0.15`, `s_meta = 0`, `s_ELA = 0.2`, `s_OCR = 0.05`. `P_AI = 100 x (0.075 + 0 + 0.04 + 0.005) = 12`.
- All four engines have `r = 1`. `Suspicion = 0.35x24 + 0.30x12 + 0.20x0 + 0.15x5 = 12.75`. **`A = 87.25`, Likely Authentic.** `C = 1.00` (High) if all four engines are high-confidence.
- Privacy terms (severity x confidence): GPS 0.70x1.0, ID document 0.90x0.79, face 0.60x0.94, face 0.60x0.88, plate 0.50x0.91, QR 0.30x0.86, phone 0.40x0.90, name 0.30x0.90, address 0.60x0.58. `R = 100 x [1 - (0.30 x 0.289 x 0.436 x 0.472 x 0.545 x 0.742 x 0.64 x 0.73 x 0.652)] = 99.8`. **Critical.**

The interface prototype shows 68 and 88 for this scenario. Those numbers are sample data typed into the prototype. The backend replaces them with the computed values.

**Example 2: the same image after sharing through a messaging app.** Suppose the sub-scores stay the same (F = 24, P\_AI = 12, M = 0, O = 5) but the Shared-Image Flag is set. Then F and M have `r = 0.5`.

- Effective weights: F 0.175, P\_AI 0.30, M 0.10, O 0.15. Their sum is 0.725.
- `Suspicion = (0.175x24 + 0.30x12 + 0.10x0 + 0.15x5) / 0.725 = 8.55 / 0.725 = 11.8`, so `A = 88.2`.
- Only P\_AI and O have `r = 1`: `C = (0.30 + 0.15) / 1.00 = 0.45`, which is **Low** confidence.

The score stays about the same, but the system is clearly less sure, and says so.

### 6.10 How the Weights and Thresholds Are Tuned

The numbers above are the starting point. The procedure below shall be carried out and its results recorded in Section 15.

1. Build a labelled set: at least 30 real camera photos, 30 edited images and 30 AI-generated images. Include copies of some images that were sent through WhatsApp or Instagram and downloaded again.
2. Split it into a tuning part and a held-back final test part.
3. Run the engines on the tuning images and save every sub-score.
4. Try several weight combinations (for example each weight from 0.1 to 0.5 in steps of 0.1, summing to 1) and keep the one that gives the best result, preferring values close to the starting weights. Tune thresholds (the 10% block fraction, `sigma_ref`, the 2-sigma rule) the same way.
5. Switch off one engine at a time (ablation) and record the change in accuracy. An engine whose removal changes little deserves a lower weight.
6. Report final accuracy only on the held-back images.

---

## 7. Shared-Image Handling

### 7.1 The Problem

Most images people want to check have already passed through WhatsApp, Instagram, Telegram or similar apps. These apps remove the metadata and re-compress the image. After that, the metadata is gone and the compression history is overwritten, so the Metadata and ELA checks lose most of their power. Research on metadata survival shows that it varies by transfer channel and that messaging platforms commonly strip or alter it (reference 14). No code can recover what has been deleted.

TruthLens therefore does not try to get around this. It detects the situation, lowers the weight of the affected checks, lowers its stated confidence, and tells the user.

### 7.2 Detecting a Shared Image (Shared-Image Flag)

| Signal | Meaning |
| --- | --- |
| S1 | No camera make or model and no capture time in the metadata |
| S2 | The longest side equals a size that sharing apps commonly produce (for example 1080, 1280, 1600 or 2048 pixels) |
| S3 | The file name matches a messaging-app pattern (for example IMG-20260104-WA0012.jpg) |
| S4 | The JPEG quantization tables match a re-compression profile recorded from known apps |

**Rule:** the Shared-Image Flag is set if S1 is true **and** at least one of S2, S3 or S4 is true. S1 is required because a genuine camera original keeps its camera metadata.

The S2 size list and the S4 profiles are built from the project's own test images, by sending images through the common apps and downloading them again. The rule is a heuristic and can be wrong in either direction, so the flag and the signals that triggered it are written into the report (FR-12.5).

### 7.3 Effect on the Scores

| Engine | Change when the flag is set |
| --- | --- |
| Metadata (M) | The 15 points for missing metadata are not added. Reliability factor `r = 0.5`. The finding reads: metadata probably removed by a sharing app |
| Forensics (F) | Reliability factor `r = 0.5`. ELA and the compression result are still shown but labelled as limited |
| AI module (P\_AI) | The metadata clue `s_meta` is set to the neutral value 0.3 instead of 0.6. The classifier weight is unchanged |
| OCR, Privacy, Sanitization | No change. These checks read what is visible in the picture and survive sharing |
| Overall confidence | Engines with `r` below 1 do not count as high-confidence, so the Confidence Level drops (Section 6.7) |

### 7.4 Notice Shown to the User

When the flag is set, the report and the screen show: "This image looks like it was shared through a messaging or social app. Metadata and manipulation checks are limited. For the best result, upload the original file. On WhatsApp, send the image as a Document to keep it unchanged." Privacy results are still reliable, and the notice says so.

### 7.5 What Is Still Reliable on a Shared Image

- Detection of faces, plates, QR codes and identity documents.
- OCR and the sensitive-text findings.
- Sanitization.
- The AI classifier, with somewhat lower accuracy on compressed images.

### 7.6 Evaluation

The test set includes shared copies of real, edited and AI-generated images. Accuracy is reported separately for original files and for shared copies (Section 15.4), which shows the size of the limitation instead of hiding it.

### 7.7 Not Attempted

Recovering lost metadata, finding the original file by reverse image search, and checking provenance standards such as C2PA are not part of this version (Section 17).

---

## 8. Non-Functional Requirements

### 8.1 Performance

- NFR-1.1: The pipeline (upload to report\_ready) shall finish within 30 seconds for a typical 5 MB image on the reference hardware (4 vCPU, 8 GB RAM). This figure is verified in testing.
- NFR-1.2: Each SSE event shall be sent within 2 seconds of its engine finishing.
- NFR-1.3: The system shall handle at least 5 concurrent sessions with no more than 50% slower stages.

### 8.2 Reliability

- NFR-2.1: If an engine fails, the pipeline continues and the Authenticity Score is computed from the remaining engines, with the failure noted in the report.
- NFR-2.2: Engine failures shall be logged with session ID, stage and exception.
- NFR-2.3: At least 99% of valid, well-formed test images shall reach report\_ready.

### 8.3 Security

- NFR-3.1: All client-server traffic shall use HTTPS/TLS outside local deployments.
- NFR-3.2: Files shall be checked for type and content mismatch before reaching any parser.
- NFR-3.3: Uploads shall be stored under random, non-guessable names in a location that cannot be served directly.
- NFR-3.4: The upload endpoint shall be rate limited.
- NFR-3.5: Credentials and keys shall come from environment variables, never from source code.

### 8.4 Privacy

- NFR-4.1: The original image shall be deleted after a configurable retention window (default 24 hours) unless the user chooses to keep it.
- NFR-4.2: Detected PII shall be stored only inside the structured report and never written to general logs.
- NFR-4.3: Images and extracted text shall not be sent to any third-party service. All models run on the backend's own infrastructure.
- NFR-4.4: The user shall see a clear notice, before upload, that the image is analysed for forensic and privacy purposes.

### 8.5 Scalability

- NFR-5.1: Any engine shall be movable to its own worker or container without changing its external contract.
- NFR-5.2: MongoDB collections shall be indexed on session ID and creation time.

### 8.6 Maintainability

- NFR-6.1: Each engine shall be an independently testable Python module with a documented input and output contract (a shared AnalysisContext structure).
- NFR-6.2: The engine layer shall have at least 60% unit test coverage.
- NFR-6.3: All weights, thresholds, severity values and app-profile lists used in Sections 6 and 7 shall be kept in one external configuration file, not in the logic.

### 8.7 Usability

- NFR-7.1: A first-time non-technical user shall be able to go from upload to report without instructions, checked with at least 3 test users.
- NFR-7.2: Every score shall carry a one-line plain-language explanation.
- NFR-7.3: The interface shall work on desktop and mobile widths.
- NFR-7.4: When the Shared-Image Flag is set, the notice in Section 7.4 shall be visible without scrolling to the details.

---

## 9. Database Design Overview

TruthLens uses MongoDB Atlas, a document database, because each engine produces a differently shaped result. The collections below are enforced in the application with Pydantic models, not by the database.

### 9.1 Collections

| Collection | Purpose | Key fields |
| --- | --- | --- |
| sessions | One record per upload and analysis | session\_id (PK), created\_at, original\_filename, file\_hash, status, retention\_expiry |
| metadata\_results | Metadata engine output | session\_id (FK), exif\_fields, gps\_present, editing\_software\_detected, findings, metadata\_risk\_score, shared\_image\_flag, flag\_signals |
| ocr\_results | OCR engine output | session\_id (FK), text\_blocks, sensitive\_findings\[\], ocr\_consistency\_score |
| privacy\_results | Privacy engine output | session\_id (FK), detected\_objects\[\], privacy\_risk\_score, risk\_band |
| forensics\_results | Forensics engine output | session\_id (FK), ela\_map\_ref, forensic\_suspicion\_score, compression\_flags, reliability\_factor |
| ai\_assessment\_results | AI module output | session\_id (FK), ai\_probability\_score, confidence\_level, signals\[\] |
| authenticity\_scores | Final fused score | session\_id (FK), authenticity\_score, risk\_level, confidence\_level, weights\_used, reliability\_factors, unavailable\_engines\[\] |
| reports | Assembled report | report\_id (PK), session\_id (FK), report\_json, rendered\_html\_ref, created\_at |
| sanitized\_artifacts | Sanitization output | session\_id (FK), sanitized\_image\_ref, sanitization\_summary, created\_at |
| audit\_logs | Minimal operational trail | log\_id (PK), session\_id (FK), stage, event\_type, timestamp |

### 9.2 Relationships

All result collections point back to the sessions collection through session\_id, one result per analysis run. The reports collection holds references to the per-engine results instead of copying them, so building a report is a read-and-assemble step. Binary files (the ELA map, the sanitized image) are kept on disk or object storage inside the deployment and referenced by path, which keeps documents small.

### 9.3 Data Retention

- Original images and temporary files are deleted after the retention window (default 24 hours), consistent with NFR-4.1.
- Reports (findings without the raw image) may be kept longer only if the user opts in.
- A scheduled cleanup job enforces deletion.

---

## 10. API Design Overview

The backend exposes a REST API for single requests and one SSE endpoint for progress. All endpoints are versioned under `/api/v1`.

### 10.1 REST Endpoints

| Method and path | Purpose | Response |
| --- | --- | --- |
| POST /api/v1/upload | Upload an image and create a session | 201 Created with session\_id |
| GET /api/v1/analyze/status/{session\_id} | Poll the current stage (SSE fallback) | 200 OK with stage and progress |
| GET /api/v1/reports/{report\_id} | Get the report as JSON | 200 OK with the report |
| GET /api/v1/reports/{report\_id}/download | Download the rendered report (PDF or HTML) | 200 OK, file stream |
| POST /api/v1/sanitize/{session\_id} | Start sanitization for a completed session | 200 OK with sanitized\_image\_id, or 409 if the report is not complete |
| GET /api/v1/sanitize/{session\_id}/download | Download the sanitized image | 200 OK, file stream |
| DELETE /api/v1/sessions/{session\_id} | Delete a session and its files early | 204 No Content |

### 10.2 Streaming Endpoint

| Endpoint | Purpose | Events |
| --- | --- | --- |
| GET /api/v1/analyze/stream/{session\_id} | SSE stream of progress | upload\_received, metadata\_done, ocr\_done, privacy\_done, forensics\_done, ai\_assessment\_done, scoring\_done, report\_ready, error |

### 10.3 Report Data Contract (abbreviated)

The report returned by the API has the shape below. The frontend shows exactly these values (Section 11).

```
{
  "session_id": "string",
  "report_id": "string",
  "authenticity": {
    "score": 0-100,
    "risk_level": "Likely Authentic | Low Concern | Moderate Concern | High Concern",
    "confidence": "Low | Medium | High",
    "contributions": [ { "engine": "string", "score": 0-100, "effective_weight": 0-1 } ]
  },
  "privacy": {
    "score": 0-100,
    "band": "Low | Moderate | High | Critical",
    "items": [ { "type": "string", "confidence": 0-1, "box": [x, y, w, h] } ]
  },
  "forensics": {
    "score": 0-100,
    "ela_map_url": "string",
    "compression_generations": 1,
    "cross_check": "string"
  },
  "ai": {
    "probability": 0-100,
    "confidence": "Low | Medium | High",
    "signals": [ { "label": "string", "value": 0-1, "direction": "up | down" } ]
  },
  "metadata": {
    "fields": { },
    "findings": [ "string" ],
    "shared_image_flag": true,
    "flag_signals": [ "S1", "S3" ]
  },
  "text": {
    "sensitive_items": [ { "type": "string", "masked_value": "string", "confidence": 0-1, "box": [x, y, w, h] } ]
  },
  "unavailable_engines": [ "string" ],
  "recommendations": [ "string" ],
  "disclaimer": "string"
}
```

### 10.4 Error Handling

- 4xx responses are for errors the client can fix (invalid file type, missing session, sanitize before the report is ready).
- 5xx responses are for real server or pipeline failures and include a correlation ID (the session\_id).
- All errors use one shape: `{ "error_code": string, "message": string, "session_id": string|null }`.

---

## 11. Screen-to-Data Mapping

Every number and card on the interface comes from one formula or one engine output, so the backend only has to return these values.

| Screen element | Value shown | Comes from |
| --- | --- | --- |
| Score ring and label | Authenticity score and risk level | A (Section 6.7), levels from FR-9.3 |
| Authenticity confidence | Low / Medium / High | C (Section 6.7) |
| Privacy risk bar | R and its band | R (Section 6.8) |
| Manipulation signs bar | F | Forensic Suspicion Score (Section 6.4) |
| AI-generated likelihood bar | P\_AI | AI Probability Score (Section 6.6) |
| Metadata card, fields and GPS badge | Camera, GPS, capture time, editing software, resolution, colour profile | ExifTool output; M (Section 6.3); GPS also feeds R |
| Metadata What this means lines | PRIVACY and OK tags | One line per metadata finding |
| Text and personal info card | Phone, name, vehicle, address (masked) | OCR words and pattern matching; feeds O and R |
| What this image reveals card | Face, plate, QR, ID document with confidence | Detector boxes; feed R |
| Manipulation check card | Suspicion score, candidate edited region, compression generations, cross-check | F, the cluster of unusual blocks, Q, X |
| ELA heat map and download link | Heat map image | ELA map saved as PNG (Section 6.4) |
| AI card, How we got there | Base classifier, camera EXIF, sensor noise, no garbled text | p\_cls, s\_meta, s\_ELA, s\_OCR (Section 6.6); a down arrow means the clue lowers the probability |
| Shared-image notice | Message from Section 7.4 | Shared-Image Flag |
| Recommendations | Sanitize image; remove metadata | Rules: faces, plate or ID found, or GPS found |
| Download report and Sanitize buttons | File download | Report and sanitize endpoints (Section 10.1) |
| Session line (analyzed just now, expires in 24h) | Session ID and retention | Session record and the cleanup job |
| Probable region card | Placeholder | Not scored; deferred (Section 17) |

---

## 12. Security and Privacy Considerations

### 12.1 Security

TruthLens passes user-supplied files through ExifTool, OpenCV and Tesseract, which have all had parser-level vulnerabilities in the past. The following measures reduce that risk within an academic deployment.

- **Input validation:** every upload is checked by extension and by content (magic bytes) before any parser sees it.
- **Process isolation:** ExifTool and Tesseract run as subprocesses with limited permissions, so a parser exploit has a small blast radius.
- **Dependency hygiene:** versions of OpenCV, Tesseract, ExifTool and Ultralytics are pinned and checked against published vulnerability lists.
- **Least-privilege storage:** the backend container can write only to its upload and working folders.
- **Secrets:** database strings and tokens come from environment variables at container start.
- **Rate limiting:** upload and analyze endpoints are rate limited per IP or session.
- **Transport security:** TLS for every deployment reachable outside localhost.
- **No code from content:** OCR text and metadata are treated only as data and are never executed, evaluated or used to build shell commands or unparameterised queries.

### 12.2 Privacy

Privacy is one of the two core deliverables of TruthLens, so the system must handle the data it detects with care.

- **Minimal retention:** original images are deleted after the retention window (default 24 hours).
- **Purpose limitation:** extracted PII is used only to build the user's own report and is never combined across sessions.
- **No third-party transmission:** all analysis runs on the system's own infrastructure.
- **Sanitization as a feature:** the user gets a one-click way to fix what the report found (UC-5).
- **Consent and transparency:** before upload, the user is told what will be extracted and why.
- **Sensitivity-aware logging:** PII values are never written to general logs; only category counts are.
- **Masked display:** sensitive values are masked on screen (FR-3.9).
- The design follows the data minimisation and purpose limitation ideas of GDPR, but the project does not claim formal GDPR compliance.

---

## 13. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Detection models miss sensitive objects (false negatives) because of the small training data a single student can collect | Medium | High (privacy) | State detection limits in the interface and report; use conservative thresholds that flag rather than miss |
| Malayalam OCR accuracy is clearly lower than English | High | Medium | Show OCR confidence; mark low-confidence findings; do not let them dominate any score |
| The backend is not yet built and the timeline slips | Medium | High (schedule) | Build in the order of Section 16: a working core (steps 1 to 9) first; report, sanitization and storage can be simplified |
| Images shared through social apps lose metadata and compression history, so those checks give weak or misleading results | High | Medium | Shared-Image Flag, reduced weights, lower confidence and a user notice (Section 7); separate accuracy reporting |
| The starting weights are untested and may not suit real images | High | Medium | Tune on a labelled set, run the ablation test, keep weights in a configuration file (Section 6.10) |
| The AI classifier is fooled by new generators | High | Medium | Never rely on it alone; show a percentage with a confidence level; document the limit |
| Users read a score as a legal verdict | Medium | High | Prominent disclaimer (Section 14.2); careful wording such as Likely Authentic and never Authentic |
| Malformed files crash a parser | Low to Medium | Medium | Subprocess isolation, strict validation and per-engine exception handling (NFR-2.1, NFR-3.2) |
| MongoDB Atlas free-tier limits are exceeded | Low | Medium | 24-hour retention keeps storage small; rate limiting limits writes |

---

## 14. Limitations and Disclaimer

### 14.1 Limitations

- TruthLens gives probabilistic, evidence-based assessments. It cannot give legally certified proof of authenticity or manipulation.
- The scores are heuristic indicators with weights tuned on a small student-collected test set. They are not calibrated probabilities and may not generalise to every kind of image.
- Images shared through social or messaging apps have lost their metadata and original compression history. Metadata and ELA results on such images are limited, and this cannot be reversed (Section 7).
- ELA is most useful on JPEG images that have been re-compressed. It is weak on PNG files and on JPEGs saved only once.
- The AI-generated-content module uses a lightweight model chosen for CPU feasibility. As generators improve, its accuracy is expected to fall without retraining.
- Detection of faces, plates, QR codes and identity documents is limited by the small, less varied data a single student can collect. Precision and recall are reported honestly.
- OCR is less accurate for Malayalam, handwriting, and low-resolution or skewed images.
- The system does not process video or audio.
- The system has not had a third-party security audit; the measures in Section 12 reduce but do not remove parser risk.

### 14.2 Standard Disclaimer

The following text shall appear in the interface and at the top of every report (FR-9.6, FR-11.5): **This is a probabilistic assessment based on visible evidence. It is not a legal verdict. Treat scores as guidance, not proof.**

---

## 15. Testing and Evaluation

### 15.1 Levels of Testing

| Level | Scope | Approach |
| --- | --- | --- |
| Unit | Single functions: EXIF parser, phone/email matchers, scoring formulas, Shared-Image Flag rule | pytest with fixture images and known expected outputs; at least 60% coverage on the engine layer (NFR-6.2). The scoring tests use the worked examples of Section 6.9 (A = 87.25, R = 99.8, and Example 2) |
| Integration | Orchestration of several engines on one image; SSE order and payloads | FastAPI TestClient tests of the full upload-to-report flow |
| Model evaluation | Detection, OCR and AI-classifier accuracy | Labelled held-out sets with precision, recall and F1 per class (Section 15.3) |
| System | Full journey: upload, live progress, report, sanitize, download | Manual and scripted browser tests on the Docker deployment |
| Security | Malformed files, oversized uploads, type spoofing | Manual tests with deliberately corrupted or mismatched files (NFR-3.2, NFR-3.4) |
| Usability | First-time understanding of scores and recommendations | Walkthrough with at least 3 non-technical users (NFR-7.1) |

### 15.2 Test Data

- **Real photos:** at least 30 unedited camera photos (to check that A trends towards Likely Authentic and F stays low).
- **Edited images:** at least 30 deliberately edited or spliced images, made by the team or taken from openly available forgery datasets, for testing ELA sensitivity.
- **AI-generated images:** at least 30 images from freely licensed generators.
- **Shared copies:** some images from each group above, sent through WhatsApp, Instagram or Telegram and downloaded again, to test Section 7.
- **Privacy-positive images:** images with visible faces, plates and dummy identity-card mockups. Real identity documents of other people shall never be used.
- Each group is split into a tuning part and a held-back final test part.

### 15.3 Measuring Accuracy

On the held-back images a cut-off is chosen (for example, Authenticity below 50 means flagged), and four things are counted:

- **True positive (TP):** an edited or AI image correctly flagged.
- **False positive (FP):** a real image wrongly flagged.
- **True negative (TN):** a real image correctly passed.
- **False negative (FN):** an edited or AI image missed.

`Accuracy = (TP + TN) / total`

`Precision = TP / (TP + FP)`  (when the system flags an image, how often it is right)

`Recall = TP / (TP + FN)`  (how many bad images it catches)

`F1 = 2 x Precision x Recall / (Precision + Recall)`

The final accuracy is reported only on the held-back images, exactly as measured, including poor results, together with a short explanation of where the system fails.

### 15.4 Results Tables (to be completed from real measurements)

| Test | Images | Accuracy | Precision | Recall | F1 |
| --- | --- | --- | --- | --- | --- |
| Real vs edited, original files |  |  |  |  |  |
| Real vs edited, shared copies |  |  |  |  |  |
| Real vs AI-generated, original files |  |  |  |  |  |
| Real vs AI-generated, shared copies |  |  |  |  |  |

| Detection class | Test images | Precision | Recall |
| --- | --- | --- | --- |
| Face |  |  |  |
| Number plate |  |  |  |
| QR code |  |  |  |
| Identity document |  |  |  |
| Sensitive text (phone, email, vehicle number) |  |  |  |

| Ablation (one engine switched off) | Accuracy | Change from full system |
| --- | --- | --- |
| Without Forensics (F) |  |  |
| Without AI module (P\_AI) |  |  |
| Without Metadata (M) |  |  |
| Without OCR (O) |  |  |

### 15.5 Acceptance Criteria

A feature is ready for demonstration when: (a) its functional requirements in Section 5 pass their unit and integration tests; (b) it degrades gracefully, without crashing the pipeline, on unusual input such as a PNG, a shared image or an image with no text; and (c) its output carries the explainability and disclaimer elements required by FR-9.5, FR-9.6 and Section 14.

---

## 16. Implementation Plan

The interface is finished, so the backend only has to return the values listed in Section 11. Build in this order. Steps 1 to 9 and 15 already give a working, testable project; steps 10 to 14 can be kept simple if time is short. Write each engine as a plain Python function first and test it on sample images with a small script, and only then connect it to the API.

| Step | Work | Done when |
| --- | --- | --- |
| 1 | Set up the project: Python 3.11, virtual environment, FastAPI, uvicorn; folders engines, scoring, api, tests | The FastAPI documentation page opens |
| 2 | Fake endpoint: return the interface's own sample JSON from the report endpoint | The frontend shows the report from the API instead of hard-coded data |
| 3 | Upload endpoint: accept JPEG, PNG and WEBP, enforce the size limit, save under a random name, create a session ID | An upload returns a session ID and the file is on disk |
| 4 | Metadata engine (ExifTool or Pillow): fields, findings, M, Shared-Image Flag | The sample photo gives the same fields as the Metadata card |
| 5 | OCR engine (pytesseract, English and Malayalam): words with confidence, regular expressions for phone, email, vehicle number and ID numbers, masking, O | A test image with a phone number shows a masked value |
| 6 | Forensics engine (Pillow and NumPy): ELA at quality 90, 16x16 blocks, E\_score, Q, X, F, heat map PNG | An edited test image scores clearly higher than an untouched camera photo |
| 7 | Privacy detection: faces (OpenCV or a face model), QR (OpenCV QR detector); plates and ID cards need dedicated models because standard YOLO models do not know these classes, so use a pretrained plate model (check its licence) and a small fine-tuned or simple ID-card detector; compute R | Boxes on the sample image match the What this image reveals card |
| 8 | AI classifier: HuggingFace image-classification pipeline; test the chosen model on your own images before trusting it; compute the four clues and P\_AI with its confidence | Real photos usually score low and AI images usually score higher |
| 9 | Scoring module: one function that takes the engine outputs and returns A, C, R, F and P\_AI; weights read from the configuration file | The unit tests of Section 6.9 pass |
| 10 | Orchestrator: run all engines, mark failures as unavailable, store results | Switching off OCR still produces a report |
| 11 | Live progress: SSE endpoint plus polling fallback | The frontend shows engines finishing one by one |
| 12 | Report download: HTML or PDF with the disclaimer and each engine's contribution | The Download report button returns a file |
| 13 | Sanitize: remove all metadata, blur detected boxes with OpenCV, allow only after the report exists | The output has no GPS and the faces are blurred |
| 14 | Storage and cleanup: MongoDB (SQLite is enough for a demo) and deletion after 24 hours | An expired session returns 404 and its file is gone |
| 15 | Test set, tuning and accuracy (Sections 6.10 and 15) | The results tables are filled with real numbers |
| 16 | Finish: error messages, README, a demo script with three sample images (real, edited, AI-generated), viva preparation | The full demonstration runs without help |

---

## 17. Future Scope

- **Probable Region engine (deferred from version 1.0).** Infer a probable region of origin from visible, non-GPS evidence: vehicle plate prefixes mapped to Kerala RTO codes, STD telephone codes, Malayalam text, a gazetteer of place names (specific names weighted above generic ones) and weak visual scene cues. Evidence would be combined with the same probabilistic OR used in Section 6.8, a region would be output only when at least one medium-or-stronger clue exists, and every output would state that it is not GPS and can be misled by staged or reused imagery. It would be a separate indicator and must never change the Authenticity Score. The retired requirements FR-8.1 to FR-8.9 describe this design.
- Extend regional inference to other Indian states through a configurable lookup module.
- Add reverse image search to find the original of a shared image, and support provenance standards such as C2PA Content Credentials as a more reliable signal.
- Replace the hand-set weights with a small trained model (for example logistic regression) once enough labelled images are available, and calibrate the scores so that they can be read as true probabilities.
- Fine-tune the detection model on a larger, purpose-collected set of Indian identity documents and vehicle plates.
- Add video frame sampling so the image engines can be used on frames of short clips.
- Add user accounts and history for researchers, with consent and retention controls.
- Add a browser extension or mobile share target so images can be sent to TruthLens from social apps before posting.
- Add OCR for more Indian languages.

---

## 18. Research Foundation and References

This section links the main technical choices to existing work. Each entry gives the source and why it matters to TruthLens.

### 18.1 Image Forensics and Error Level Analysis

- **Krawetz, N., A Picture's Worth: Digital Image Analysis and Forensics.** Introduced ELA as a low-cost way to show local JPEG re-compression artefacts. It underlies FR-6.1, FR-6.2 and Section 6.4, and its known weakness on PNG and single-save JPEGs is stated in Section 14.
- **IEEE Xplore, Detection of Image Forgery Using Error Level Analysis.** Describes an ELA system built with OpenCV for copy-move, splicing and removal forgeries. It supports treating ELA as one signal among several.
- **Comparative ELA and CNN studies, including CASIA-V2 evaluations.** They report that ELA feature maps help classifiers but depend on JPEG compression artefacts. This supports using ELA as a clue for the AI module (FR-7.3) and the PNG limit.

### 18.2 Optical Character Recognition

- **Smith, R., An Overview of the Tesseract OCR Engine.** Explains the layout analysis and classifier of Tesseract. Its open licence and Malayalam support justify the choice for FR-3.x.

### 18.3 Object Detection

- **Reis, Hong, Kupec and Daoudi, Real-Time Flying Object Detection with YOLOv8 (arXiv, 2023).** Reports high accuracy after transfer learning and fast inference. It supports YOLOv8 Nano for the Privacy engine (FR-4.x) and the expected accuracy range on a modest custom dataset.
- **What is YOLOv8: An In-Depth Exploration of the Internal Features of the Next-Generation Object Detector (arXiv, 2024).** Explains the architecture and speed-accuracy trade-off that suit a CPU-only deployment.

### 18.4 AI-Generated Content Detection

- **Unmasking AI-Created Visual Content: A Review of Generated Images and Deepfake Detection Technologies (Journal of King Saud University, Computer and Information Sciences).** Separates active (watermark) from passive (artefact) forensics and notes that most generators do not embed watermarks. It justifies the passive, multi-clue design of Section 6.6.
- **Tasnim et al., AI-Generated Image Detection: An Empirical Study and Future Research Directions (2025).** Finds that detectors generalise poorly across generator types. It is the basis for the limit in Section 14 and for showing a confidence level.

### 18.5 EXIF Metadata, Privacy and Metadata Survival

- **Privacy Implications of EXIF Data (EDUCAUSE Review).** Documents real location disclosures through GPS and device fields. It motivates the metadata findings (FR-2.7), GPS in R (FR-4.9) and mandatory GPS removal in sanitization (FR-5.2).
- **Research on EXIF leakage in mobile apps, including MetaLeak.** Shows that metadata is often outside normal permission controls, which is why metadata is shown by default.
- **Forensic Value of Exif Data: An Analytical Evaluation of Metadata Integrity across Image Transfer Methods.** Shows that direct transfers keep metadata while many messaging and social platforms strip or alter it. It is the direct basis for Section 7 and for treating missing metadata with care (FR-2.8, FR-12.4).

### 18.6 Combining Evidence and Probabilities

- **Kittler, Hatef, Duin and Matas, On Combining Classifiers (1998).** Studies weighted-sum and related rules for combining several classifiers. It supports the weighted fusion in Section 6.7.
- **Pearl, Probabilistic Reasoning in Intelligent Systems (1988).** Describes the noisy-OR model that is the basis of Section 6.8.
- **Guo, Pleiss, Sun and Weinberger, On Calibration of Modern Neural Networks (2017).** Shows that classifier outputs are often not true probabilities. It supports the statement that the scores are indicators and not calibrated probabilities.

### 18.7 References

| # | Reference |
| --- | --- |
| 1 | Krawetz, N. A Picture's Worth: Digital Image Analysis and Forensics. Hacker Factor Solutions (foundational documentation on Error Level Analysis). |
| 2 | IEEE Xplore. Detection Of Image Forgery Using Error Level Analysis. IEEE Conference Publication. https://ieeexplore.ieee.org/document/10467523 |
| 3 | Image forgery detection using error level analysis and deep learning, and related comparative ELA-CNN studies, including CASIA-V2-based evaluations of ELA with VGG-16/CNN classifiers. |
| 4 | Effect of Error Level Analysis on The Image Forgery Detection Using Deep Learning. Comparative study of ELA-CNN performance on forgery datasets. |
| 5 | Smith, R. An Overview of the Tesseract OCR Engine. Google / Tesseract OCR project documentation. |
| 6 | Reis, D., Hong, J., Kupec, J., Daoudi, A. Real-Time Flying Object Detection with YOLOv8. arXiv:2305.09972 (2023). https://arxiv.org/abs/2305.09972 |
| 7 | What is YOLOv8: An In-Depth Exploration of the Internal Features of the Next-Generation Object Detector. arXiv:2408.15857 (2024). https://arxiv.org/abs/2408.15857 |
| 8 | Unmasking AI-Created Visual Content: A Review of Generated Images and Deepfake Detection Technologies. Journal of King Saud University - Computer and Information Sciences (Springer Nature Link, 2025). |
| 9 | Tasnim et al. AI-Generated Image Detection: An Empirical Study and Future Research Directions (2025). https://arxiv.org/html/2511.02791v1 |
| 10 | Deepfake video detection: challenges and opportunities. Artificial Intelligence Review, Springer Nature Link (2024). https://link.springer.com/article/10.1007/s10462-024-10810-6 |
| 11 | Privacy Implications of EXIF Data. EDUCAUSE Review (2021). https://er.educause.edu/articles/2021/6/privacy-implications-of-exif-data |
| 12 | LLMs on support of privacy and security of mobile apps: state of the art and research directions. arXiv:2506.11679 (discussion of EXIF metadata exposure and mobile permission-model gaps). |
| 13 | MetaLeak: Assessing Image Metadata Leakage in Android Apps (research on image-metadata leakage in mobile ecosystems). |
| 14 | Forensic Value of Exif Data: An Analytical Evaluation of Metadata Integrity across Image Transfer Methods. Perspectives in Legal and Forensic Sciences, SCIEPublish (2025). |
| 15 | Ultralytics. YOLOv8 official documentation and Nano-variant model cards. https://docs.ultralytics.com |
| 16 | ExifTool documentation by Phil Harvey. https://exiftool.org |
| 17 | OpenCV documentation. https://docs.opencv.org |
| 18 | HuggingFace Transformers documentation and model hub. https://huggingface.co/docs |
| 19 | FastAPI official documentation. https://fastapi.tiangolo.com |
| 20 | MongoDB Atlas documentation. https://www.mongodb.com/docs/atlas/ |
| 21 | Next.js official documentation. https://nextjs.org/docs |
| 22 | Mozilla Developer Network. Server-Sent Events (SSE) / EventSource API. https://developer.mozilla.org/en-US/docs/Web/API/Server-sent\_events |
| 23 | IEEE Std 830-1998. IEEE Recommended Practice for Software Requirements Specifications (structural and terminological reference for this SRS's format). |
| 24 | Kittler, J., Hatef, M., Duin, R. P. W., Matas, J. On Combining Classifiers. IEEE Transactions on Pattern Analysis and Machine Intelligence (1998). |
| 25 | Pearl, J. Probabilistic Reasoning in Intelligent Systems. Morgan Kaufmann (1988). |
| 26 | Guo, C., Pleiss, G., Sun, Y., Weinberger, K. Q. On Calibration of Modern Neural Networks. ICML (2017). |

Note: several sources above are preprints (arXiv) or aggregator-indexed venues alongside peer-reviewed IEEE and Springer publications; where a source is a preprint this is noted so the panel can weigh it. References 24 to 26 were added in version 2.0 and their details should be checked against the original publications before submission.
