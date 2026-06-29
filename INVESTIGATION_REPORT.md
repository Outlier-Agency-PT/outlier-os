# Investigação: Tarefa "Deploy em Produção" não aparece no Kanban

## Resumo
Investigou-se o problema relatado onde uma tarefa guardada com `list_id = '0726833a-64fc-4000-8522-97a423144cd6'` não aparecia no kanban quando essa lista estava selecionada.

## Descobertas

### 1. Estado Atual da Base de Dados
- ✓ A BD está **completamente vazia**
- ✗ Nenhum espaço (task_spaces)
- ✗ Nenhuma lista (task_lists)
- ✗ Nenhuma tarefa (tasks)
- A lista com ID '0726833a-64fc-4000-8522-97a423144cd6' **não existe**

### 2. Análise do Código

#### `lib/queries/tasks.ts` - Função `getTasksByList()`
```typescript
export async function getTasksByList(listId: string): Promise<TaskWithHierarchy[]> {
  const supabase = await createClient();

  const { data: rootTasks } = await supabase
    .from("tasks")
    .select(`...`)
    .eq("list_id", listId)           // ✓ Comparação correta
    .is("parent_task_id", null)      // ✓ Filtro correto
    .order("position", { ascending: true });

  if (!rootTasks) return [];
  // ... resto do código
}
```

**Conclusão**: A query está **correta**. Não há problemas de tipo ou casting.

#### `app/(app)/tarefas/page.tsx`
```typescript
const selectedListId = searchParams.list;
const DEFAULT_LIST_ID = "00000000-0000-0000-0000-000000000011";
const listId = selectedListId || DEFAULT_LIST_ID;
const [tasks, statuses, clients, members, spaces, listTasks] = await Promise.all([
  getTasks(),
  getStatuses("task_statuses"),
  getClients(),
  getTeamMembers(),
  getTaskSpaces(),
  getTasksByList(listId),  // ✓ Passagem correta do listId
]);
```

**Conclusão**: A page.tsx passa o `listId` corretamente à função.

## Possíveis Causas do Problema

### Causa 1: Lista Inexistente (MAIS PROVÁVEL)
- A lista com ID '0726833a-64fc-4000-8522-97a423144cd6' não existe na BD
- Solução: Criar a lista no Supabase Studio ou verificar o ID correto

### Causa 2: Tarefa Sem list_id
- A tarefa pode ter sido guardada com `list_id = null`
- Solução: Verificar no Supabase Studio o valor de `list_id` da tarefa

### Causa 3: Whitespace ou Casting (IMPROVÁVEL)
- Espaços em branco no UUID
- Type casting incorreto do PostgreSQL
- Solução: Trimpar o `listId` na page.tsx:
```typescript
const listId = (selectedListId?.trim() || DEFAULT_LIST_ID);
```

### Causa 4: Parent Task (IMPROVÁVEL)
- A tarefa pode ter `parent_task_id != null`
- A função `getTasksByList()` filtra apenas tarefas raiz (`parent_task_id is null`)
- Solução: Se a tarefa for uma subtarefa, ela aparecerá dentro da tarefa pai

## Recomendações

### 1. Verificar a BD
No Supabase Studio, executar:
```sql
SELECT * FROM task_lists WHERE id = '0726833a-64fc-4000-8522-97a423144cd6';
SELECT * FROM tasks WHERE title ILIKE '%Deploy%Produção%';
```

### 2. Criar Dados de Teste
Se a BD está vazia, criar dados de teste:
```sql
-- Criar espaço
INSERT INTO task_spaces (name, color, is_private) 
VALUES ('Produção', '#ef4444', false) 
RETURNING id;

-- Criar lista
INSERT INTO task_lists (space_id, name, color) 
VALUES ('<space_id>', 'Deploy', '#dc2626') 
RETURNING id;

-- Criar tarefa
INSERT INTO tasks (title, list_id, status_id, created_by) 
VALUES ('Deploy em Produção', '<list_id>', '<status_id>', '<user_id>');
```

### 3. Melhorias Sugeridas no Código
Adicionar trimming no `listId`:
```typescript
// app/(app)/tarefas/page.tsx
const selectedListId = searchParams.list?.trim();
```

## Conclusão
O código está **funcionando corretamente**. O problema é que a BD está vazia ou a lista não existe com o ID mencionado.
