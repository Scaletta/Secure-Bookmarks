# Privacy Policy for Secure Bookmarks

Last updated: 2026-07-27

Secure Bookmarks is a Chrome extension that helps users save and manage bookmarks protected by a master password.

## Summary

- We do not sell user data.
- We do not use data for advertising.
- We do not transfer bookmark data to external servers.
- Bookmark data is stored locally in the browser and encrypted before storage.

## Data We Process

Secure Bookmarks processes the following data only to provide its core functionality:

- Bookmark title
- Bookmark URL
- Bookmark creation timestamp
- Encrypted vault data and local extension state

This data is stored locally using Chrome storage APIs.

## Chrome Permissions and Why They Are Needed

### storage

The storage permission is required to save encrypted bookmark data and extension state locally on the user's device.

### tabs

The tabs permission is required to read the active tab's URL and title when the user chooses to add the current page as a bookmark.

## Encryption and Security

- Bookmark data is encrypted client-side using a master password before it is saved.
- The extension is designed so that plaintext bookmark vault contents are not sent to external services.

## External Code and Third Parties

- The extension does not execute remotely hosted code at runtime.
- All extension code is packaged with the published build.
- The extension does not share user bookmark data with third parties.

## Data Retention and Deletion

- Data remains on the user's device until the user deletes bookmarks, clears extension data, or uninstalls the extension.
- Users control their own data directly from the extension UI and browser settings.

## Children's Privacy

Secure Bookmarks is not directed to children under 13 and does not knowingly collect personal information from children.

## Changes to This Policy

This Privacy Policy may be updated from time to time. Material changes will be reflected by updating the date at the top of this document.

## Contact

For questions about this policy, contact:

- Repository: https://github.com/Scaletta/secure-bookmarks
