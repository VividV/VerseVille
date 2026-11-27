"""
Generates the reference-data section of supabase/schema.sql from the app's JSON
data, so the server checks use exactly the same prices, quests and verses.
Run from the repository root:  python3 scripts/supabase/generate-seed.py
"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parents[2]
data = root / 'src' / 'data'
schema = root / 'supabase' / 'schema.sql'
MARK = '-- ---------- Reference data rows (generated) ----------'

def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, list): return "array[" + ", ".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"

# Starting garden quantities (src/engine/garden/startingGarden.ts)
start_src = (root / 'src/engine/garden/startingGarden.ts').read_text()
starting = {}
for item in re.findall(r"itemId: '([a-z_]+)'", start_src):
    starting[item] = starting.get(item, 0) + 1

# Reward base amounts (src/engine/rewards/rewardCalculator.ts)
calc = (root / 'src/engine/rewards/rewardCalculator.ts').read_text()
def amounts(name):
    body = re.search(name + r": \{([^}]*)\}", calc).group(1)
    return {k.strip("' "): int(v) for k, v in re.findall(r"('?[\w-]+'?): (\d+)", body)}
xp, coins = amounts('gameXp'), amounts('gameCoins')

out = [MARK, 'begin;']
items = json.loads((data / 'buildings.json').read_text()) + json.loads((data / 'decorations.json').read_text())
for i in items:
    out.append(f"insert into public.garden_catalog values ({q(i['id'])}, {i['coinCost']}, {i['seedCost']}, {i['unlockLevel']}, "
               f"{i['width']}, {i['height']}, {q(i['isUnique'])}, {q(bool(i.get('notForSale')))}, {starting.get(i['id'], 0)}) "
               "on conflict (item_id) do update set coin_cost = excluded.coin_cost, seed_cost = excluded.seed_cost, "
               "unlock_level = excluded.unlock_level, width = excluded.width, height = excluded.height, is_unique = excluded.is_unique, "
               "not_for_sale = excluded.not_for_sale, starting_quantity = excluded.starting_quantity;")
for e in json.loads((data / 'expansions.json').read_text()):
    out.append(f"insert into public.land_expansions values ({e['id']}, {e['rows']}, {e['requiredLevel']}, {e['requiredMastered']}, {e['coinCost']}) "
               "on conflict (id) do update set rows = excluded.rows, required_level = excluded.required_level, "
               "required_mastered = excluded.required_mastered, coin_cost = excluded.coin_cost;")
for qd in json.loads((data / 'quests.json').read_text()):
    out.append(f"insert into public.quest_catalog values ({q(qd['id'])}, {qd['coinReward']}, {qd['xpReward']}, {qd['target']}) "
               "on conflict (quest_id) do update set coin_reward = excluded.coin_reward, xp_reward = excluded.xp_reward, target = excluded.target;")
for g in xp:
    out.append(f"insert into public.reward_rules values ({q(g)}, {coins[g]}, {xp[g]}) "
               "on conflict (game_type) do update set base_coins = excluded.base_coins, base_xp = excluded.base_xp;")
for s in json.loads((data / 'scriptures.json').read_text()):
    out.append("insert into public.scriptures values (" + ", ".join(q(s[k]) for k in
               ['id', 'book', 'chapter', 'verse', 'reference', 'translation', 'text', 'explanation', 'topicIds', 'relatedScriptureIds', 'difficulty', 'isActive'])
               + ") on conflict (id) do update set text = excluded.text, explanation = excluded.explanation, "
               "topic_ids = excluded.topic_ids, related_scripture_ids = excluded.related_scripture_ids, is_active = excluded.is_active;")
out.append('commit;')

text = schema.read_text()
if MARK in text:
    text = text[: text.index(MARK)]
schema.write_text(text.rstrip() + '\n\n' + '\n'.join(out) + '\n')
print(f'{len(items)} items, {len(xp)} reward rules, scriptures and quests written to {schema}')
