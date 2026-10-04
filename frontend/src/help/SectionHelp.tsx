import { useId, useRef } from 'react'
import { CircleHelp } from 'lucide-react'
import { helpTopics, type HelpTopic } from './topics'

export function SectionHelp({
  topic,
  tone = 'plain',
  fallback,
}: {
  topic: string
  tone?: 'plain' | 'banner'
  fallback?: HelpTopic
}) {
  const help = helpTopics[topic] || fallback
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  if (!help) return null

  function close() {
    dialogRef.current?.close()
  }

  const buttonClass = tone === 'banner'
    ? 'shrink-0 w-8 h-8 rounded-full border border-white/40 text-white grid place-items-center hover:bg-white/15'
    : 'shrink-0 w-7 h-7 rounded-full border border-slate-200 text-slate-600 grid place-items-center hover:bg-white'

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-label={`راهنمای ${help.title}`}
        onClick={() => dialogRef.current?.showModal()}
      >
        <CircleHelp size={16} aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        className="crm-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === dialogRef.current) close()
        }}
      >
        <div className="glass-card rounded-2xl bg-white p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-base font-semibold text-slate-800">راهنمای {help.title}</h2>
            <button type="button" className="text-sm text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100" onClick={close}>
              بستن
            </button>
          </div>
          <p className="text-sm text-slate-700 leading-7">{help.about}</p>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">آموزش کوتاه</h3>
            <ol className="list-decimal pr-5 text-sm text-slate-700 leading-7 flex flex-col gap-1.5">
              {help.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        </div>
      </dialog>
    </>
  )
}
