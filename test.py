import requests
import pandas as pd
from vulnerability_test_cases import TEST_CASES

API_URL = "http://127.0.0.1:5000/api/scan"

results = []

for case in TEST_CASES:
    case_id = case["id"]
    actual_label = str(case["label"]).strip().lower()
    code = case["code"]

    try:
        response = requests.post(
            API_URL,
            json={
                "code": code,
                "language": "python"
            },
            timeout=60
        )
        response.raise_for_status()
        data = response.json()

        prediction = str(data["prediction"]).strip().lower()
        confidence = data.get("confidence")
        vulnerable_probability = data.get("vulnerable_probability")

        correct = prediction == actual_label

        results.append({
            "id": case_id,
            "category": case.get("category", "unknown"),
            "actual_label": actual_label,
            "server_prediction": prediction,
            "confidence": confidence,
            "vulnerable_probability": vulnerable_probability,
            "correct": correct
        })

        print(
            f'{case_id}: actual={actual_label}, '
            f'predicted={prediction}, '
            f'confidence={confidence}, '
            f'vulnerable_probability={vulnerable_probability}, '
            f'correct={correct}'
        )

    except Exception as e:
        print(f"{case_id}: ERROR - {e}")

df = pd.DataFrame(results)

if not df.empty:
    print("\nTotal tested:", len(df))
    print("Correct:", int(df["correct"].sum()))
    print(f'Accuracy: {df["correct"].mean() * 100:.2f}%')

    print("\nPerformance by actual label:")
    print(
        df.groupby("actual_label")["correct"]
        .agg(["sum", "count", "mean"])
    )

    df.to_csv("server_test_results.csv", index=False)
    print("\nResults saved to server_test_results.csv")
