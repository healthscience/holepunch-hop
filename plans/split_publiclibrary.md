# Plan: Split `publiclibrary` into `publiclibrary-ref` and `publiclibrary-mod`

## 1. Initialization Changes
In `setupHyperbee`:
- Replace `this.dbPublicLibrary` with `this.dbPublicLibraryRef` (name: `publiclibrary-ref`) and `this.dbPublicLibraryMod` (name: `publiclibrary-mod`).
- Both will be announced to the DHT using their respective discovery keys.
- Update `beePubkeys` to include both.

## 2. New Methods
- `savePubliclibraryRef(refContract)`: Saves to `dbPublicLibraryRef`.
- `savePubliclibraryMod(refContract)`: Saves to `dbPublicLibraryMod`.
- `getPublicLibraryRef(contractID)`: Gets from `dbPublicLibraryRef`.
- `getPublicLibraryMod(contractID)`: Gets from `dbPublicLibraryMod`.
- `getPublicLibraryRefRange(range)`: Range query for `dbPublicLibraryRef`.
- `getPublicLibraryModRange(range)`: Range query for `dbPublicLibraryMod`.
- `getPublicLibraryRefLast(dataPrint)`: Last entry for `dbPublicLibraryRef`.
- `getPublicLibraryModLast(dataPrint)`: Last entry for `dbPublicLibraryMod`.
- `deletePublicLibraryRef(nxpID)`: Delete from `dbPublicLibraryRef`.
- `deletePublicLibraryMod(nxpID)`: Delete from `dbPublicLibraryMod`.

## 3. Refactoring
- Replace existing `dbPublicLibrary` references in the above methods with the new ones.
- I will focus on the core CRUD operations as requested.

Does this simplified plan look correct? I will proceed to implement these changes in `Code` mode once approved.