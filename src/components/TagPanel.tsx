import { useState } from "react"
import type { TagType, WalletState } from "../types"
import { submitAddressTag, getAddressTags } from "../lib/messaging"
import { TAG_COLORS } from "../constants"
import { cn } from "../utils/cn"

interface TagPanelProps {
  wallet: WalletState
}

const tagTypes: { value: TagType; label: string; icon: string }[] = [
  { value: "scammer", label: "Scammer", icon: "🔴" },
  { value: "suspicious", label: "Suspicious", icon: "🟡" },
  { value: "verified", label: "Verified", icon: "🟢" },
  { value: "bot", label: "Bot", icon: "🟣" },
  { value: "personal", label: "Personal", icon: "🔵" },
]

export function TagPanel({ wallet }: TagPanelProps) {
  const [address, setAddress] = useState("")
  const [tagType, setTagType] = useState<TagType>("suspicious")
  const [label, setLabel] = useState("")
  const [evidence, setEvidence] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [existingTags, setExistingTags] = useState<any[]>([])

  const handleCheckTags = async () => {
    if (!address.trim()) return
    try {
      const resp = await getAddressTags(address.trim())
      setExistingTags(resp?.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmit = async () => {
    if (!address.trim() || !wallet.address) return
    setSubmitting(true)
    setMessage(null)

    try {
      const resp = await submitAddressTag({
        address: address.trim(),
        tag: tagType,
        label,
        evidence,
        submittedBy: wallet.address,
      })

      if (resp?.error) {
        setMessage({ type: "err", text: resp.error })
      } else {
        setMessage({ type: "ok", text: "Tag submitted! Community votes will verify it." })
        setAddress("")
        setLabel("")
        setEvidence("")
        handleCheckTags()
      }
    } catch (e: any) {
      setMessage({ type: "err", text: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="sifix-card">
        <span className="text-[10px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-1.5">
          Address Tagging
        </span>
        <p className="text-[10px] text-sifix-text-40 mb-3 leading-relaxed">
          Tag addresses to warn the community. Tags are verified by community votes.
        </p>

        {/* Address input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x... address"
            className="flex-1 bg-sifix-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-sifix-text placeholder:text-sifix-text-40 focus:outline-none focus:border-sifix-primary/40 transition-colors font-mono"
          />
          <button
            onClick={handleCheckTags}
            className="px-3 rounded-xl text-[10px] font-medium bg-sifix-bg border border-white/[0.06] text-sifix-text-60 hover:text-sifix-text hover:border-white/[0.12] transition-all"
          >
            Check
          </button>
        </div>

        {/* Existing tags */}
        {existingTags.length > 0 && (
          <div className="mb-3 p-2.5 bg-sifix-bg rounded-xl border border-white/[0.04]">
            <span className="text-[9px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-1">Existing Tags</span>
            {existingTags.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                <span style={{ color: TAG_COLORS[t.tag] }}>{t.tag}</span>
                <span className="text-sifix-text-60">{t.label}</span>
                <span className="text-sifix-text-40 ml-auto font-mono">▲{t.votesUp} ▼{t.votesDown}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tag type */}
        <div className="mb-3">
          <span className="text-[9px] text-sifix-text-40 uppercase tracking-widest font-sans font-medium block mb-1.5">Tag Type</span>
          <div className="flex gap-1.5 flex-wrap">
            {tagTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTagType(t.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 border",
                  tagType === t.value
                    ? "border-sifix-primary/30 bg-sifix-primary/10 text-sifix-text shadow-glow"
                    : "border-white/[0.04] bg-sifix-bg text-sifix-text-40 hover:text-sifix-text-70 hover:border-white/[0.08]"
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Short label (e.g. 'Known drainer')"
          className="w-full bg-sifix-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-sifix-text placeholder:text-sifix-text-40 focus:outline-none focus:border-sifix-primary/40 transition-colors mb-2 font-body"
        />

        {/* Evidence */}
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Evidence or reason for this tag..."
          rows={2}
          className="w-full bg-sifix-bg border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-sifix-text placeholder:text-sifix-text-40 focus:outline-none focus:border-sifix-primary/40 transition-colors resize-none mb-3 font-body"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !address.trim() || !wallet.address}
          className={cn(
            "w-full py-2.5 rounded-xl text-xs font-medium transition-all duration-200",
            "sifix-gradient text-white hover:shadow-glow active:scale-[0.98]",
            (submitting || !address.trim() || !wallet.address) && "opacity-40 cursor-not-allowed hover:shadow-none"
          )}
        >
          {submitting ? <span className="sifix-spinner" /> : "🏷️ Submit Tag"}
        </button>

        {!wallet.address && (
          <p className="text-[10px] text-sifix-danger mt-1.5 text-center font-body">
            Connect wallet to submit tags
          </p>
        )}

        {/* Message */}
        {message && (
          <div className={cn(
            "mt-2 p-2.5 rounded-xl text-[10px] font-body border",
            message.type === "ok"
              ? "bg-sifix-safe/5 text-sifix-safe border-sifix-safe/20"
              : "bg-sifix-danger/5 text-sifix-danger border-sifix-danger/20"
          )}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
