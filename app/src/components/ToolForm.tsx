import { ActionForm } from "@/components/ActionForm";
import { PhotoInput } from "@/components/PhotoInput";
import { saveTool } from "@/app/actions/tools";
import { CATEGORIES } from "@/lib/access";

type T = { id: string; name: string; category: string; value: number | null; description: string | null; tip: string | null; link: string | null; video: string | null; photoVer: number; groupIds: string[] };

export function ToolForm({ tool, groups }: { tool?: T; groups: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveTool} className="panel form">
      {tool && <input type="hidden" name="id" value={tool.id} />}
      <label className="f full">Tool name<input id="name" name="name" required defaultValue={tool?.name} placeholder="e.g. Ryobi orbital sander" /></label>
      <label className="f">Kind of tool<select id="category" name="category" defaultValue={tool?.category || "Power tools"}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="f">Value in dollars <small>Optional. Helps borrowers know how careful to be.</small><input id="value" name="value" inputMode="numeric" defaultValue={tool?.value ?? ""} placeholder="80" /></label>
      <div className="f full">Photo
        <PhotoInput current={tool?.photoVer ? `/api/photo/${tool.id}?v=${tool.photoVer}` : null} />
        {tool?.photoVer ? <label className="row" style={{ fontWeight: 400 }}><input type="checkbox" name="removePhoto" id="removePhoto" /> Take off the current photo</label> : null}
      </div>
      <label className="f">Link to the tool online <small>Optional</small><input id="link" name="link" defaultValue={tool?.link ?? ""} placeholder="https://" /></label>
      <label className="f">How-to video link <small>Optional, e.g. YouTube</small><input id="video" name="video" defaultValue={tool?.video ?? ""} placeholder="https://" /></label>
      <label className="f full">Description <small>Optional. What's included: case, bits, blades, batteries.</small><textarea id="description" name="description" defaultValue={tool?.description ?? ""} /></label>
      <label className="f full">Good to know <small>Quirks or special steps, like &quot;hold the primer bulb down 3 seconds or it won&apos;t start&quot;</small><textarea id="tip" name="tip" defaultValue={tool?.tip ?? ""} /></label>
      <div className="full f">Share with
        {groups.length === 0 ? <small>You&apos;re not in any groups yet. The tool stays private until you join one.</small> :
          <div className="row" style={{ gap: 16 }}>{groups.map((g) => (
            <label key={g.id} className="row" style={{ gap: 6, fontWeight: 500, color: "var(--ink)" }}>
              <input type="checkbox" name="groups" value={g.id} id={`g-${g.id}`} defaultChecked={tool ? tool.groupIds.includes(g.id) : true} /> {g.name}
            </label>))}</div>}
        <small>Leave all unticked to keep the tool private.</small>
      </div>
      <div className="full"><button className="primary">{tool ? "Save changes" : "Add to my garage"}</button></div>
    </ActionForm>
  );
}
