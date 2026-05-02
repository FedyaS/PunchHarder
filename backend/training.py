import shutil
from pathlib import Path

import yaml
from ultralytics import YOLO


CANONICAL_ORDER = ["jab", "hook", "uppercut", "cross", "no punch", "bag"]


def normalize_class_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


def discover_yolo_datasets(training_data_dir: Path) -> list[Path]:
    return sorted(path.parent for path in training_data_dir.rglob("data.yaml"))


def ensure_clean_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def build_merged_dataset(repo_root: Path, dataset_dirs: list[Path]) -> tuple[Path, list[str]]:
    merged_root = repo_root / "training_data" / "merged_yolo"
    for split in ["train", "valid", "test"]:
        ensure_clean_dir(merged_root / split / "images")
        ensure_clean_dir(merged_root / split / "labels")

    class_set = set()
    dataset_metadata = []

    # Pass 1: read class names from every dataset.
    for dataset_dir in dataset_dirs:
        data_yaml_path = dataset_dir / "data.yaml"
        data = yaml.safe_load(data_yaml_path.read_text(encoding="utf-8"))
        names = [normalize_class_name(name) for name in data["names"]]
        class_set.update(names)
        dataset_metadata.append((dataset_dir, names))

    ordered_classes = [name for name in CANONICAL_ORDER if name in class_set]
    ordered_classes += sorted(class_set - set(ordered_classes))
    merged_class_to_idx = {name: idx for idx, name in enumerate(ordered_classes)}

    # Pass 2: copy images/labels and remap class IDs in label files.
    for dataset_dir, local_names in dataset_metadata:
        local_idx_to_name = {idx: name for idx, name in enumerate(local_names)}
        ds_name = dataset_dir.name.replace(" ", "_")

        for split in ["train", "valid", "test"]:
            src_images = dataset_dir / split / "images"
            src_labels = dataset_dir / split / "labels"
            if not src_images.exists() or not src_labels.exists():
                continue

            for image_path in src_images.iterdir():
                if not image_path.is_file():
                    continue
                target_image_name = f"{ds_name}__{image_path.name}"
                shutil.copy2(image_path, merged_root / split / "images" / target_image_name)

                src_label_path = src_labels / f"{image_path.stem}.txt"
                if not src_label_path.exists():
                    continue

                target_label_path = merged_root / split / "labels" / f"{Path(target_image_name).stem}.txt"
                remapped_lines = []
                for line in src_label_path.read_text(encoding="utf-8").splitlines():
                    parts = line.strip().split()
                    if len(parts) < 5:
                        continue
                    old_idx = int(parts[0])
                    class_name = local_idx_to_name[old_idx]
                    new_idx = merged_class_to_idx[class_name]
                    remapped_lines.append(" ".join([str(new_idx), *parts[1:]]))
                target_label_path.write_text("\n".join(remapped_lines), encoding="utf-8")

    merged_data_yaml = merged_root / "data.yaml"
    merged_data_yaml.write_text(
        yaml.safe_dump(
            {
                "path": str(merged_root.resolve()),
                "train": "train/images",
                "val": "valid/images",
                "test": "test/images",
                "nc": len(ordered_classes),
                "names": ordered_classes,
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    return merged_data_yaml, ordered_classes


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    training_data_dir = repo_root / "training_data"

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
        project=str((repo_root / "training_runs").resolve()),
        name="punch_detector",
    )

    print("\nTraining complete.")
    print("Best weights:", repo_root / "training_runs" / "punch_detector" / "weights" / "best.pt")


if __name__ == "__main__":
    main()