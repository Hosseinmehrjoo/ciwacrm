import { probabilityForStage, type FieldDef } from '../crm/modules'
import { updateModuleRecord, type CrmRecord } from '../api/records'

export function OpportunityBoard({
  records,
  stageField,
  onMoved,
}: {
  records: CrmRecord[]
  stageField: FieldDef
  onMoved: () => void
}) {
  const stages = stageField.options ?? []

  async function move(id: string, stage: string) {
    await updateModuleRecord('Opportunities', id, {
      sales_stage: stage,
      probability: probabilityForStage(stage),
    })
    onMoved()
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map((stage) => {
        const cards = records.filter((record) => (record.attributes.sales_stage || '') === stage.value)
        const sum = cards.reduce((total, record) => total + (Number(record.attributes.amount) || 0), 0)
        return (
          <section
            key={stage.value}
            className="flex w-56 shrink-0 flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const id = event.dataTransfer.getData('text/plain')
              if (id) void move(id, stage.value)
            }}
          >
            <header className="px-1">
              <p className="text-xs font-semibold text-slate-800">{stage.label}</p>
              <p className="text-[11px] text-slate-500">{cards.length.toLocaleString('fa-IR')} · {sum.toLocaleString('fa-IR')}</p>
            </header>
            {cards.map((record) => (
              <article
                key={record.id}
                draggable
                onDragStart={(event) => event.dataTransfer.setData('text/plain', record.id)}
                className="cursor-grab rounded-xl border border-slate-200 bg-white p-2"
              >
                <p className="text-sm font-medium text-slate-800">{record.attributes.name}</p>
                <p className="mt-1 text-xs text-slate-600">{Number(record.attributes.amount || 0).toLocaleString('fa-IR')}</p>
                <label className="mt-2 block text-[11px] text-slate-500">
                  انتقال
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                    value={stage.value}
                    onChange={(event) => void move(record.id, event.target.value)}
                  >
                    {stages.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}
