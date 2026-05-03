import argparse
from pathlib import Path

import yaml
from ultralytics import YOLO

from combine_data import build_merged_dataset, discover_yolo_datasets


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the punch detector model")
    parser.add_argument("--force-merge", action="store_true", help="Re-merge datasets even if merged data already exists")
    parser.add_argument("--device", default=0, help="Device to train on (0 for GPU, 'cpu' for CPU)")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    training_data_dir = repo_root / "training_data"
    merged_data_yaml = training_data_dir / "merged_yolo" / "data.yaml"

    if merged_data_yaml.exists() and not args.force_merge:
        print(f"Using existing merged dataset: {merged_data_yaml}")
        data = yaml.safe_load(merged_data_yaml.read_text(encoding="utf-8"))
        ordered_classes = data["names"]
    else:
        if not training_data_dir.exists():
            raise RuntimeError(f"Missing training data directory: {training_data_dir}")

        dataset_dirs = discover_yolo_datasets(training_data_dir)
        if not dataset_dirs:
            raise RuntimeError(f"No YOLO datasets found under: {training_data_dir}")

        print("Found datasets:")
        for dataset_dir in dataset_dirs:
            print(f"- {dataset_dir}")

        merged_data_yaml, ordered_classes = build_merged_dataset(repo_root, dataset_dirs)

    print(f"\nMerged classes: {ordered_classes}")
    print(f"Merged data yaml: {merged_data_yaml}")

    model = YOLO("yolov8n.pt")
    model.train(
        data=str(merged_data_yaml),
        epochs=50,
        imgsz=640,
        batch=16,
        device=args.device,
        verbose=True,
        project=str((repo_root / "training_runs").resolve()),
        name="punch_detector",
    )

    print("\nTraining complete.")
    print("Best weights:", repo_root / "training_runs" / "punch_detector" / "weights" / "best.pt")


if __name__ == "__main__":
    main()
