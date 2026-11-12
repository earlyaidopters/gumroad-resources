#pragma once

#include <lvgl.h>
#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>

// AvatarSet — runtime-loadable avatar art container in PSRAM.
//
// Replaces the compile-time static `avatar_images.{cc,h}` lookup with a
// dynamic set uploaded from the gateway via WebSocket binary frames.
// See docs/intent/stackchan_avatar_pipeline.md in the SAIVerse repository
// for the pipeline design, the load_avatar_set MCP tool, the 3-layer
// fallback (placeholder / local static / dynamic set), and the rationale
// for raw-RGB565-only on the firmware side.
//
// Coexistence policy:
//   - Until Load() succeeds at least once, callers should fall back to
//     the existing static tables in avatar_images.h (= placeholder or
//     local override). is_loaded() reports the current state.
//   - This class does NOT consume or modify avatar_images.{cc,h} — it
//     lives alongside them as a separate path. Existing local-override
//     users see no behaviour change.

class AvatarSet {
public:
    enum class Mode : uint8_t {
        kLayered = 0,  // 14 symbols (face 6 + eyes 3 + mouth 5)
        kMatrix  = 1,  // 90 symbols (face 6 × eyes 3 × mouth 5)
    };

    static constexpr int kNumFaces  = 6;  // idle / happy / thinking / sad / surprised / embarrassed
    static constexpr int kNumEyes   = 3;  // open / half / closed
    static constexpr int kNumMouths = 5;  // closed / half / open / e / u
    static constexpr int kMatrixSize = kNumFaces * kNumEyes * kNumMouths;  // 90

    // Fixed geometry — matches firmware/scripts/avatar_convert/convert_avatars.py
    // (TARGET_W / TARGET_H) and the LVGL scale already applied in stackchan.cc.
    static constexpr int kImageWidth  = 160;
    static constexpr int kImageHeight = 120;
    static constexpr size_t kImageBytes =
        static_cast<size_t>(kImageWidth) * static_cast<size_t>(kImageHeight) * 2;  // RGB565 LE

    // Expected raw payload sizes (for early size checks at the loader boundary).
    static constexpr size_t kLayeredPayloadBytes =
        static_cast<size_t>(kNumFaces + kNumEyes + kNumMouths) * kImageBytes;   // 14 * 38400
    static constexpr size_t kMatrixPayloadBytes =
        static_cast<size_t>(kMatrixSize) * kImageBytes;                          // 90 * 38400

    AvatarSet();
    ~AvatarSet();

    AvatarSet(const AvatarSet&) = delete;
    AvatarSet& operator=(const AvatarSet&) = delete;

    Mode mode() const { return mode_; }
    bool is_loaded() const { return loaded_; }

    // ---- Layered mode lookups ----
    // 0-indexed. Returns nullptr if not loaded, mode != kLayered, or index out of range.
    const lv_image_dsc_t* GetFace(int face_index) const;
    const lv_image_dsc_t* GetEyes(int eyes_index) const;
    const lv_image_dsc_t* GetMouth(int mouth_index) const;

    // ---- Matrix mode lookup ----
    // Returns nullptr if not loaded, mode != kMatrix, or any index out of range.
    const lv_image_dsc_t* GetMatrix(int face_index, int eyes_index, int mouth_index) const;

    // Adopt an externally-allocated PSRAM buffer as the new avatar set.
    //
    // Layered layout:
    //   [0 ..)                                      face   × 6
    //   [kNumFaces * kImageBytes ..)                eyes   × 3
    //   [(kNumFaces + kNumEyes) * kImageBytes ..)   mouth  × 5
    //   total = kLayeredPayloadBytes
    //
    // Matrix layout (linear, idx = face * 15 + eyes * 5 + mouth):
    //   [idx * kImageBytes .. (idx+1) * kImageBytes)
    //   total = kMatrixPayloadBytes
    //
    // Ownership: on success, AvatarSet takes ownership of `owned_buffer`
    // (allocated with heap_caps_malloc(SPIRAM)) and will heap_caps_free it
    // on the next Unload() / AdoptOwnedBuffer() / destruction. The caller
    // MUST NOT free `owned_buffer` after a successful call. On failure
    // (null pointer or size mismatch) the function returns false WITHOUT
    // touching `owned_buffer` — the caller retains ownership and is
    // responsible for freeing it. The previously loaded set (if any) is
    // preserved on any failure path.
    //
    // This is ownership-transfer to keep PSRAM peak low: the fetcher's
    // staging buffer is handed directly to AvatarSet without an internal
    // memcpy. The pointer swap to lv_image_dsc_t entries happens after
    // the new buffer is fully validated, so the LCD draws from the old
    // buffer until the swap commits (no black-frame flash on update).
    bool AdoptOwnedBuffer(Mode mode, uint8_t* owned_buffer, size_t image_data_size);

    // Lil Token: show a set whose buffer is owned by an AvatarSetCache.
    // Same checks and descriptor swap as AdoptOwnedBuffer, but this class
    // never frees `buffer`: Unload() and later adoptions leave it alone.
    bool ActivateBorrowed(Mode mode, uint8_t* buffer, size_t image_data_size);

    // The buffer currently on screen (owned or borrowed), or nullptr.
    const uint8_t* buffer() const { return image_buffer_; }

    // Release the PSRAM buffer (if owned) and clear all internal
    // lv_image_dsc_t entries. Safe to call multiple times.
    void Unload();

private:
    Mode mode_ = Mode::kLayered;
    bool loaded_ = false;

    // PSRAM buffer holding all image data for the current set.
    // lv_image_dsc_t::data of each table entry points into this buffer.
    uint8_t* image_buffer_ = nullptr;
    size_t   image_buffer_size_ = 0;
    bool     owns_buffer_ = true;  // false while showing a cached (borrowed) set

    bool Install(Mode mode, uint8_t* buffer, size_t image_data_size, bool owned);

    // lv_image_dsc_t entries populated by Load() to point into image_buffer_.
    lv_image_dsc_t face_table_[kNumFaces]{};
    lv_image_dsc_t eyes_table_[kNumEyes]{};
    lv_image_dsc_t mouth_table_[kNumMouths]{};
    lv_image_dsc_t matrix_table_[kMatrixSize]{};

    // Fill the fixed fields (magic / cf / w / h / stride / data_size) of a
    // descriptor. The caller still sets `data` to the PSRAM offset.
    static void InitImageHeader(lv_image_dsc_t* dsc);
};

// Lil Token: face sets kept in PSRAM so switching back to one that was
// loaded before needs no download.
//
// A layered set is a 537 KB HTTP download that takes the robot 5 to 10 s,
// and it handles nothing else meanwhile. Lil Token swaps sets several times
// in one conversation (the Firecrawl and Google badges, the party hat, back
// to the default face), and every spoken answer waited behind a swap. Sets
// are keyed by the checksum the gateway sends with avatar_set_fetch, so the
// protocol is unchanged: a known checksum is activated at once and answered
// with avatar_set_loaded, without opening the URL.
//
// Not thread safe. Every call happens on the avatar_fetch task, which runs
// one at a time (avatar_fetch_in_progress_), with the display lock held
// around anything that changes what is on screen.
class AvatarSetCache {
public:
    static constexpr size_t kMaxSets = 4;  // 4 x 537.6 KB = 2.1 MB of the 8 MB PSRAM

    struct Entry {
        std::string checksum;
        AvatarSet::Mode mode;
        uint8_t* buffer;
        size_t size;
        uint32_t used;  // larger = used more recently
    };

    ~AvatarSetCache();

    // The cached set with this checksum, marked as just used. nullptr if none.
    const Entry* Find(const std::string& checksum);

    // Take ownership of `buffer`. Frees the least recently used sets beyond
    // kMaxSets, never the one whose buffer is `keep` (the set on screen).
    void Insert(const std::string& checksum, AvatarSet::Mode mode,
                uint8_t* buffer, size_t size, const uint8_t* keep);

    // Free the least recently used set other than `keep`. False if there is none.
    bool EvictOne(const uint8_t* keep);

    size_t size() const { return entries_.size(); }

private:
    std::vector<Entry> entries_;
    uint32_t clock_ = 0;
};

