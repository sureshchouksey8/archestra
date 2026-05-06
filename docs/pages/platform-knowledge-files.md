---
title: Files
category: Knowledge
order: 3
description: Upload files directly into Knowledge retrieval and assign them to agents.
lastUpdated: 2026-05-06
---

<!--
Check ../docs_writer_prompt.md before changing this file.

-->

Files are uploaded documents that can be indexed for `query_knowledge_sources` without creating a connector. Use them for static reference material, runbooks, policies, exports, and other documents that do not need scheduled sync from an external system.

## How Files Work

Open **Knowledge > Files**, upload one or more supported files, choose visibility, and assign agents. Each file is indexed as its own hidden knowledge source so it can be searched by the selected agents.

Supported uploads are `.txt`, `.md`, `.csv`, `.json`, `.xml`, and `.pdf`, up to 10 MB each.

Chat attachments are separate: they stay with the conversation. Upload files here when they should be reusable by agents across conversations.

## Visibility

Files use the same visibility model as other knowledge resources.

| Mode | Behavior |
| --- | --- |
| **Owner** | Only the uploader can view and query the file. |
| **Teams** | Members of the selected teams can view and query the file. |
| **Organization** | Everyone in the organization can view and query the file. |

Users with `knowledgeFile:admin` can view and manage all uploaded files in the organization.

## Storage

By default, uploaded file bytes are stored in the application database. Deployments can store file bytes in S3 instead; metadata and indexing state remain in the database.

For S3 setup, see [External Blob Storage](#external-blob-storage).

## External Blob Storage

External blob storage is disabled by default.

To use S3, set `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_BLOB_STORAGE_PROVIDER=s3` and provide bucket and region. IRSA is the default auth method for EKS deployments: grant the Kubernetes service account access to the bucket through an AWS IAM role.

Static access keys are also supported for environments that do not use IRSA.

| Variable | Description |
| --- | --- |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_BLOB_STORAGE_PROVIDER` | `db` by default. Set to `s3` to store file bytes in S3. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_BUCKET` | S3 bucket name. Required when provider is `s3`. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_REGION` | AWS region for the bucket. Required when provider is `s3`. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_PREFIX` | Optional object key prefix. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_ENDPOINT` | Optional S3-compatible endpoint. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_FORCE_PATH_STYLE` | Set to `true` for S3-compatible services that require path-style URLs. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_AUTH_METHOD` | `irsa` by default. Set to `static` to use access keys. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_ACCESS_KEY_ID` | Static access key ID. Used only when auth method is `static`. |
| `ARCHESTRA_KNOWLEDGE_BASE_FILE_UPLOAD_S3_SECRET_ACCESS_KEY` | Static secret access key. Used only when auth method is `static`. |
