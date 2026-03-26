# Refactoring Plan: Splitting `src/storage/bees.js`

The current `src/storage/bees.js` file is over 1600 lines long and manages multiple distinct data domains. This plan proposes splitting it into smaller, more manageable modules.

## Proposed Directory Structure

```text
src/
├── storage/
│   ├── bees.js (Main entry point/coordinator)
│   ├── modules/
│   │   ├── publicLibrary.js (Public Library Ref/Mod)
│   │   ├── peerLibrary.js (Peer Library Ref/Mod)
│   │   ├── results.js (HOP Results)
│   │   ├── ledger.js (Coherence Ledger)
│   │   ├── chat.js (Bento Chat)
│   │   ├── clock.js (Heli Clock)
│   │   ├── spaces.js (Bento Spaces, Solo Spaces)
│   │   ├── cues/
│   │   │   ├── index.js (Cues coordinator)
│   │   │   ├── boxes.js (Bento Boxes)
│   │   │   ├── models.js (Bento Models)
│   │   │   ├── research.js (Bento Research, Besearch)
│   │   │   ├── markers.js (Bento Markers)
│   │   │   ├── products.js (Bento Products)
│   │   │   ├── media.js (Bento Media)
│   │   │   └── learn.js (BeeBee Learn)
│   │   └── cues.js (Bento Cues)
│   └── drive.js
```

## Implementation Strategy

1.  **Base Class / Mixin Approach**: Create a base class or a set of helper functions for common Hyperbee operations (put, get, del, createReadStream with prefix).
2.  **Domain Modules**: Each module in `src/storage/modules/` will export a class or a set of functions that take a `Hyperbee` instance and provide domain-specific methods.
3.  **Coordinator (`bees.js`)**: The main `HyperBee` class will:
    *   Initialize all `Hypercore` and `Hyperbee` instances.
    *   Instantiate the domain modules.
    *   Delegate calls to the appropriate module.
    *   Maintain the `EventEmitter` interface for backward compatibility.

## Detailed Module Breakdown

### 1. `publicLibrary.js`
*   **Databases**: `dbPublicLibraryRef`, `dbPublicLibraryMod`
*   **Methods**: `savePubliclibraryRef`, `savePubliclibraryMod`, `getPublicLibraryRef`, `getPublicLibraryMod`, `getPublicLibraryRefRange`, `getPublicLibraryModRange`, `getPublicLibraryRefLast`, `getPublicLibraryModLast`, `deletePublicLibraryRef`, `deletePublicLibraryMod`, `replicatePubliclibrary`, `replicateQueryPubliclibrary`, `saveRepliatePubLibary`, `addConfrimPublicLibrary`, `updatePublicLibrary`

### 2. `peerLibrary.js`
*   **Databases**: `dbPeerLibraryRef`, `dbPeerLibraryMod`
*   **Methods**: `savePeerLibraryRef`, `savePeerLibraryMod`, `getPeerLibraryRef`, `getPeerLibraryMod`, `getPeerLibraryRefRange`, `getPeerLibraryModRange`, `getPeerLibraryRefLast`, `getPeerLibraryModLast`, `getPeerLibModComputeModules`, `deletePeerLibraryRef`, `deletePeerLibraryMod`

### 3. `results.js`
*   **Databases**: `dbHOPresults`
*   **Methods**: `saveHOPresults`, `peerResults`, `peerResultsItem`, `deleteResultsItem`, `replicateHOPresults`

### 4. `ledger.js`
*   **Databases**: `dbCohereceLedger`
*   **Methods**: `saveKBLentry`, `KBLentries`, `peerLedgerProof`

### 5. `chat.js`
*   **Databases**: `dbBentochat`
*   **Methods**: `saveBentochat`, `deleteBentochat`, `getBentochat`, `getBentochatHistory`

### 6. `clock.js`
*   **Databases**: `dbHeliClock`
*   **Methods**: `saveHeliClock`, `deleteHeliClock`, `getHeliClock`, `getHeliClockHistory`

### 7. `spaces.js`
*   **Databases**: `dbBentospaces`
*   **Methods**: `saveSpaceHistory`, `saveBentospace`, `getBentospace`, `getAllBentospaces`, `deleteBentospace`, `saveSolospace`, `getSolospace`

### 8. `cues.js`
*   **Databases**: `dbBentocues`
*   **Methods**: `saveCues`, `getCues`, `getCuesHistory`, `deleteBentocue`, `updateCuesLibrary`

### 9. `boxes.js`
*   **Databases**: `dbBentoBoxes`
*   **Methods**: `saveBentoBox`, `getBentoBox`, `getBentoBoxHistory`, `deleteBentoBox`

### 10. `models.js`
*   **Databases**: `dbBentomodels`
*   **Methods**: `saveModel`, `getModel`, `getModelHistory`, `deleteBentoModel`

### 11. `research.js`
*   **Databases**: `dbBentoresearch`, `dbBesearch`
*   **Methods**: `saveResearch`, `getResearch`, `getResearchHistory`, `deleteBentoResearch`, `saveBesearch`, `getBesearch`, `getBesearchHistory`, `deleteBentoBesearch`

### 12. `markers.js`
*   **Databases**: `dbBentomarkers`
*   **Methods**: `saveMarker`, `getMarker`, `getMarkerHistory`, `deleteBentoMarker`

### 13. `products.js`
*   **Databases**: `dbBentoproducts`
*   **Methods**: `saveProduct`, `getProduct`, `getProductHistory`, `deleteBentoProduct`

### 14. `media.js`
*   **Databases**: `dbBentomedia`
*   **Methods**: `saveMedia`, `getMedia`, `getMediaHistory`, `deleteBentomedia`

### 15. `learn.js`
*   **Databases**: `dbBeeBeeLearn`
*   **Methods**: `saveBeeBeeLearn`, `deleteBeeBeeLearn`, `getBeeBeeLearn`, `getBeeBeeLearnHistory`

## Next Steps
1.  Create the `src/storage/modules/` directory.
2.  Implement each module one by one, starting with the most independent ones (e.g., `ledger.js`, `results.js`).
3.  Update `src/storage/bees.js` to use these modules.
4.  Verify with existing tests.
