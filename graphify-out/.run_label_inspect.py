import json
from pathlib import Path

analysis = json.loads(Path("graphify-out/.graphify_analysis.json").read_text(encoding="utf-8"))
communities = analysis["communities"]
# Print community -> node labels for manual labeling
for cid, node_ids in list(communities.items())[:20]:
    print(f"Community {cid} ({len(node_ids)} nodes): {node_ids[:5]}")
print(f"... total {len(communities)} communities")
