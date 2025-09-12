# Large Model Files Setup

This project uses large model files that are not stored in Git due to size constraints. Follow the instructions below to set up these files for your local development environment.

## Required Model Files

- `lfm2-vl-450m.bundle` (367 MB) - Vision language model for image processing

## Option 1: Manual Download & Placement

1. Download the model file from the team's shared storage:
   - Internal team members: Download from [Team SharePoint/Drive Link]
   - External collaborators: Request access from project maintainers
   
2. Place the file in this directory:

   ```plaintext
   android/app/src/main/assets/models/lfm2-vl-450m.bundle
   ```

3. Verify the file integrity (optional):

   ```powershell
   # PowerShell
   Get-FileHash -Algorithm SHA256 android/app/src/main/assets/models/lfm2-vl-450m.bundle
   ```
   Expected hash: [Add hash here]

## Option 2: Download Script (Future Enhancement)

We plan to add a download script to automate this process in the future. In the meantime, please use Option 1.

## Option 3: External Storage (Production Recommendation)

For production apps, we recommend:

1. Loading model files from external storage
2. Implementing a first-run download mechanism
3. Storing models in the app's private storage area

This approach saves app installation size and allows for model updates without app updates.

Example code for this can be found in `app/src/leap/modelManager.ts` (to be implemented).

## Questions?

Contact the repository maintainer for assistance.
