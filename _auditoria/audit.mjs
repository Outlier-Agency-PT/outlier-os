// ClickUp workspace audit script
import { writeFileSync } from 'node:fs';

const TOKEN = 'pk_78147437_PDYJ68NC1AT3RWPAOSMEM1QCOBST2UWB';
const BASE = 'https://api.clickup.com/api/v2';

const SPACES = [
  { id: '90090355791', name: 'Outlier Agency - Gestão' },
  { id: '90124067326', name: 'Recursos Humanos' },
  { id: '90120400222', name: 'Outlier Agency - Equipa' },
  { id: '90120400325', name: 'Administrativo' },
  { id: '90123667904', name: 'Leads Hunters (dpt Revenue)' },
  { id: '90120689979', name: 'Revenue' },
  { id: '90121434805', name: 'Mapa de Lançamentos' },
  { id: '90120400413', name: 'Clientes One Shot' },
  { id: '90120400467', name: 'Clientes Long Term' },
  { id: '90124975577', name: 'Template Lançamentos' },
];

const headers = { Authorization: TOKEN, 'Content-Type': 'application/json' };

async function api(path) {
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} on ${path}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// Retry wrapper for rate limiting
async function apiRetry(path, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await api(path);
    } catch (e) {
      if (i === attempts - 1) throw e;
      const wait = (i + 1) * 1500;
      console.error(`  retry ${i + 1} for ${path} after ${wait}ms (${e.message.slice(0, 80)})`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

function slimTask(t) {
  return {
    id: t.id,
    name: t.name,
    status: t.status?.status,
    status_type: t.status?.type,
    due_date: t.due_date,
    date_updated: t.date_updated,
    date_created: t.date_created,
    assignees: (t.assignees || []).map(a => a.username),
  };
}

async function getListTasks(listId) {
  // first page only, 30 tasks max (default page size 100, we cap below)
  const data = await apiRetry(`/list/${listId}/task?archived=false&page=0&order_by=updated&reverse=true&include_closed=true`);
  const tasks = (data.tasks || []).slice(0, 30).map(slimTask);
  return tasks;
}

async function getFolderLists(folderId) {
  const data = await apiRetry(`/folder/${folderId}/list?archived=false`);
  return data.lists || [];
}

async function getSpaceFolders(spaceId) {
  const data = await apiRetry(`/space/${spaceId}/folder?archived=false`);
  return data.folders || [];
}

async function getFolderlessLists(spaceId) {
  const data = await apiRetry(`/space/${spaceId}/list?archived=false`);
  return data.lists || [];
}

async function processList(rawList) {
  console.error(`    list ${rawList.id} "${rawList.name}"`);
  const tasks = await getListTasks(rawList.id);
  const open = tasks.filter(t => t.status_type === 'open').length;
  const closed = tasks.filter(t => t.status_type === 'closed').length;
  const lastUpdate = tasks.reduce((max, t) => {
    const u = parseInt(t.date_updated || '0', 10);
    return u > max ? u : max;
  }, 0);
  return {
    id: rawList.id,
    name: rawList.name,
    task_count: rawList.task_count,
    open_count: open,
    closed_count: closed,
    last_task_update: lastUpdate || null,
    tasks,
  };
}

async function processFolder(rawFolder) {
  console.error(`  folder ${rawFolder.id} "${rawFolder.name}"`);
  const lists = await getFolderLists(rawFolder.id);
  const processed = [];
  for (const l of lists) {
    processed.push(await processList(l));
  }
  return {
    id: rawFolder.id,
    name: rawFolder.name,
    hidden: rawFolder.hidden,
    lists: processed,
  };
}

async function processSpace(space) {
  console.error(`space ${space.id} "${space.name}"`);
  const folders = await getSpaceFolders(space.id);
  const folderlessLists = await getFolderlessLists(space.id);

  const processedFolders = [];
  for (const f of folders) {
    processedFolders.push(await processFolder(f));
  }
  const processedFolderless = [];
  for (const l of folderlessLists) {
    processedFolderless.push(await processList(l));
  }
  return {
    id: space.id,
    name: space.name,
    folders: processedFolders,
    folderless_lists: processedFolderless,
  };
}

(async () => {
  const tree = { generated_at: new Date().toISOString(), spaces: [] };
  for (const s of SPACES) {
    try {
      tree.spaces.push(await processSpace(s));
    } catch (e) {
      console.error(`FAIL space ${s.id}: ${e.message}`);
      tree.spaces.push({ id: s.id, name: s.name, error: e.message });
    }
  }
  const out = 'c:/Users/utilizadoroutlier/Claude Code Projects/PROJETOS/outlier-os/_auditoria/clickup_dump.json';
  writeFileSync(out, JSON.stringify(tree, null, 2));
  console.error(`WROTE ${out}`);

  // ----- summary -----
  const allLists = [];
  let totalFolders = 0;
  let totalTasksSampled = 0;
  let totalOpen = 0;
  let totalClosed = 0;
  const perSpace = [];

  for (const sp of tree.spaces) {
    if (sp.error) {
      perSpace.push({ name: sp.name, error: sp.error });
      continue;
    }
    let listsInSpace = 0;
    let openInSpace = 0;
    let closedInSpace = 0;
    const collectLists = (list, folderName) => {
      allLists.push({ space: sp.name, folder: folderName, ...list });
      listsInSpace++;
      openInSpace += list.open_count;
      closedInSpace += list.closed_count;
      totalTasksSampled += list.tasks.length;
    };
    for (const f of sp.folders) {
      totalFolders++;
      for (const l of f.lists) collectLists(l, f.name);
    }
    for (const l of sp.folderless_lists) collectLists(l, null);
    totalOpen += openInSpace;
    totalClosed += closedInSpace;
    perSpace.push({
      name: sp.name,
      folders: sp.folders.length,
      lists: listsInSpace,
      open: openInSpace,
      closed: closedInSpace,
    });
  }

  // Top 10 most recently active lists
  const topActive = [...allLists]
    .filter(l => l.last_task_update)
    .sort((a, b) => b.last_task_update - a.last_task_update)
    .slice(0, 10)
    .map(l => ({
      space: l.space,
      folder: l.folder,
      name: l.name,
      open: l.open_count,
      closed: l.closed_count,
      last_update: new Date(l.last_task_update).toISOString().slice(0, 10),
    }));

  // Stale lists > 60 days
  const sixtyDaysAgo = Date.now() - 60 * 86400 * 1000;
  const stale = allLists
    .filter(l => l.last_task_update && l.last_task_update < sixtyDaysAgo && (l.open_count > 0 || l.tasks.length > 0))
    .sort((a, b) => a.last_task_update - b.last_task_update)
    .map(l => ({
      space: l.space,
      folder: l.folder,
      name: l.name,
      open: l.open_count,
      last_update: new Date(l.last_task_update).toISOString().slice(0, 10),
    }));

  // Strategic candidates: lists/folders whose name suggests a project (not generic ops bucket)
  const projectHints = /(projeto|projet|lançamento|lancamento|launch|iniciativa|2025|2026|q1|q2|q3|q4|sprint|plano|roadmap|migra|setup|implement|onboard|reposicion|brand|relaunch|operação|operacao)/i;
  const opsBuckets = /^(backlog|inbox|tarefas|todo|to do|geral|general|template)$/i;
  const candidates = allLists
    .filter(l => projectHints.test(l.name) && !opsBuckets.test(l.name))
    .map(l => ({ space: l.space, folder: l.folder, name: l.name, open: l.open_count, last_update: l.last_task_update }))
    .sort((a, b) => (b.last_update || 0) - (a.last_update || 0))
    .slice(0, 15);

  const summary = {
    totals: {
      spaces: tree.spaces.length,
      folders: totalFolders,
      lists: allLists.length,
      tasks_sampled: totalTasksSampled,
      open: totalOpen,
      closed: totalClosed,
    },
    per_space: perSpace,
    top_active_lists: topActive,
    strategic_candidates: candidates,
    stale_lists_60d: stale.slice(0, 25),
    stale_count_total: stale.length,
  };

  writeFileSync(
    'c:/Users/utilizadoroutlier/Claude Code Projects/PROJETOS/outlier-os/_auditoria/clickup_summary.json',
    JSON.stringify(summary, null, 2)
  );
  console.log(JSON.stringify(summary, null, 2));
})().catch(e => {
  console.error('FATAL', e);
  process.exit(1);
});
