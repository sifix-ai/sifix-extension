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
        <span className="text-xs text-sifix-muted uppercase tracking-wider block mb-2">
          Address Tagging
        </span>
        <p className="text-[10px] text-sifix-muted/60 mb-3">
          Tag addresses to warn the community. Tags are verified by community votes.
        </p>

        {/* Address input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x... address"
            className="flex-1 bg-sifix-surface border border-sifix-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-sifix-muted/50 focus:outline-none focus:border-sifix-primary/50"
          />
          <button
            onClick={handleCheckTags}
            className="px-3 rounded-lg text-[10px] bg-sifix-surface border border-sifix-border text-sifix-muted hover:text-white transition-colors"
          >
            Check
          </button>
        </div>

        {/* Existing tags */}
        {existingTags.length > 0 && (
          <div className="mb-3 p-2 bg-sifix-surface rounded-lg">
            <span className="text-[10px] text-sifix-muted block mb-1">Existing Tags</span>
            {existingTags.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
                <span style={{ color: TAG_COLORS[t.tag] }}>{t.tag}</span>
                <span className="text-sifix-muted">{t.label}</span>
                <span className="text-sifix-muted/60">▲{t.votesUp} ▼{t.votesDown}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tag type */}
        <div className="mb-3">
          <span className="text-[10px] text-sifix-muted block mb-1">Tag Type</span>
          <div className="flex gap-1">
            {tagTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTagType(t.value)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] transition-all border",
                  tagType === t.value
                    ? "border-sifix-primary/50 bg-sifix-primary/10 text-white"
                    : "border-sifix-border bg-sifix-surface text-sifix-muted hover:text-white"
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
          className="w-full bg-sifix-surface border border-sifix-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-sifix-muted/50 focus:outline-none focus:border-sifix-primary/50 mb-2"
        />

        {/* Evidence */}
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Evidence or reason for this tag..."
          rows={2}
          className="w-full bg-sifix-surface border border-sifix-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-sifix-muted/50 focus:outline-none focus:border-sifix-primary/50 resize-none mb-3"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !address.trim() || !wallet.address}
          className={cn(
            "w-full py-2 rounded-lg text-xs font-medium transition-all",
            "bg-sifix-primary hover:bg-sifix-primary-dark text-white",
            (submitting || !address.trim() || !wallet.address) && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitting ? <span className="sifix-spinner" /> : "🏷️ Submit Tag"}
        </button>

        {!wallet.address && (
          <p className="text-[10px] text-sifix-danger mt-1 text-center">
            Connect wallet to submit tags
          </p>
        )}

        {/* Message */}
        {message && (
          <div className={cn(
            "mt-2 p-2 rounded-lg text-[10px]",
            message.type === "ok" ? "bg-sifix-safe/10 text-sifix-safe" : "bg-sifix-danger/10 text-sifix-danger"
          )}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
