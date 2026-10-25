"""
Run the group's hand-written test cases (Easy / Medium / Complex) through the running backend.

Usage (backend must be running: python server.py):
    python test_300.py                      # reads test_cases_300.py in this folder
    python test_300.py path/to/test_cases_300.py

- Only the *_test_cases lists are read from the file; none of its code is executed
  (its model-loading code and Colab path are ignored).
- Each case goes to POST /api/predict, so the result is exactly what the app gives:
  same model (MODEL_DIR), same whitespace cleanup, same scoring rule and threshold.
- Saves every prediction to test_300_results.csv.
"""

import ast
import sys
import warnings
from pathlib import Path

import pandas as pd
import requests
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

API = "http://127.0.0.1:5000"

# The cases file has regex strings like '\.' that trigger harmless SyntaxWarnings when parsed.
warnings.filterwarnings("ignore", category=SyntaxWarning)


def load_cases(path):
    """Read every list named *test_cases* written out literally in the file (no code is executed)."""
    src = Path(path).read_text(encoding="utf-8")

    # Tolerate a cut-off tail (e.g. a truncated paste): drop lines from the first syntax error.
    while True:
        try:
            tree = ast.parse(src)
            break
        except SyntaxError as err:
            if not err.lineno or err.lineno <= 1:
                raise
            src = "\n".join(src.splitlines()[: err.lineno - 1])

    cases = []
    for node in tree.body:
        if not (isinstance(node, ast.Assign) and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Name)):
            continue
        name = node.targets[0].id
        if "test_cases" not in name.lower():
            continue
        # Skip lists built from other names, e.g. all_test_cases = easy + medium + complex
        if any(isinstance(n, (ast.Name, ast.Call, ast.Attribute, ast.Subscript)) for n in ast.walk(node.value)):
            continue

        items = ast.literal_eval(node.value)
        level = name.lower().replace("_test_cases", "").replace("test_cases", "").strip("_") or "all"

        for i, item in enumerate(items, start=1):
            if isinstance(item, dict):
                code, label = item["code"], item["label"]
            else:
                code, label = item
            if isinstance(label, str):
                label = int(label.strip().lower() in ("1", "vulnerable", "vuln", "true"))
            cases.append({"level": level.capitalize(), "idx": i, "code": code, "label": int(label)})

    if not cases:
        sys.exit(f"No *_test_cases lists found in {path}")
    return pd.DataFrame(cases)


def metrics(y, yhat):
    p, r, f, _ = precision_recall_fscore_support(y, yhat, average="binary", zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y, yhat, labels=[0, 1]).ravel()
    return {"cases": len(y), "accuracy": accuracy_score(y, yhat), "precision": p,
            "recall": r, "f1": f, "TN": tn, "FP": fp, "FN": fn, "TP": tp}


def main(path):
    try:
        health = requests.get(f"{API}/api/health", timeout=5).json()
    except requests.RequestException:
        sys.exit(f"Backend not reachable at {API}. Start it with: python server.py")

    cases = load_cases(path)
    print(f"Model: {health.get('model_name')}  |  rule: {health.get('scoring_rule_description')}")
    print(f"Loaded {len(cases)} cases from {path}: "
          + ", ".join(f"{lvl} {len(g)} ({g.label.sum()} vulnerable)" for lvl, g in cases.groupby("level", sort=False)))

    print()
    scores, preds, thresholds, confidences = [], [], [], []
    names = {0: "safe", 1: "vulnerable"}
    for row in cases.itertuples():
        r = requests.post(f"{API}/api/predict", json={"code": row.code}, timeout=120)
        r.raise_for_status()
        data = r.json()
        pred = int(data["prediction"] == "vulnerable")
        scores.append(data["vulnerable_probability"])
        thresholds.append(data["threshold"])
        confidences.append(data["confidence"])
        preds.append(pred)
        # Same per-case line as test.py
        case_id = f"{row.level[0]}{row.idx:03d}"          # E001, M001, C001
        print(f"{case_id}: actual={names[row.label]}, predicted={names[pred]}, "
              f"confidence={data['confidence']}, vulnerable_probability={data['vulnerable_probability']}, "
              f"correct={pred == row.label}")

    cases["score"], cases["threshold"], cases["confidence"], cases["pred"] = scores, thresholds, confidences, preds
    cases["correct"] = cases.pred == cases.label
    cases["actual_label"] = cases.label.map(names)

    # Same summary as test.py
    print(f"\nTotal tested: {len(cases)}")
    print(f"Correct: {int(cases.correct.sum())}")
    print(f"Accuracy: {cases.correct.mean() * 100:.2f}%")
    print("\nPerformance by actual label:")
    print(cases.groupby("actual_label")["correct"].agg(["sum", "count", "mean"]).round(3))

    rows = [{"level": lvl, **metrics(g.label, g.pred)} for lvl, g in cases.groupby("level", sort=False)]
    rows.append({"level": "ALL", **metrics(cases.label, cases.pred)})
    table = pd.DataFrame(rows)

    pd.set_option("display.width", 160)
    print("\n=== Results by level (label 1 = vulnerable) ===")
    print(table.round(3).to_string(index=False))

    wrong = cases[~cases.correct]
    print(f"\nMisclassified: {len(wrong)}  "
          f"(false positives: {int(((wrong.label == 0)).sum())}, missed vulnerabilities: {int((wrong.label == 1).sum())})")
    for _, w in wrong.head(15).iterrows():
        first = next((l.strip() for l in w.code.strip().splitlines() if l.strip()), "")[:70]
        kind = "FALSE POSITIVE" if w.label == 0 else "MISSED"
        print(f"  {w.level:<8} #{w.idx:<3} {kind:<14} score={w.score:.3f}  {first}")
    if len(wrong) > 15:
        print(f"  ... {len(wrong) - 15} more in test_300_results.csv")

    out = cases.drop(columns=["code", "actual_label"]).assign(code_start=cases.code.str.strip().str[:80])
    out.to_csv("test_300_results.csv", index=False)
    table.round(4).to_csv("test_300_summary.csv", index=False)
    print("\nSaved: test_300_results.csv (every case) and test_300_summary.csv")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "test_cases_300.py")
