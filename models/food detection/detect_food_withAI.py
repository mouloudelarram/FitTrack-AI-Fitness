from ultralytics import YOLO
from collections import Counter
import cv2
import os

def count_food_items(image_path):
    # Load the model
    model = YOLO("yolov8n.pt")

    # Run inference
    results = model.predict(source=image_path, conf=0.25, save=False, verbose=False)

    food_counts = {}

    # Read original image
    img = cv2.imread(image_path)

    for result in results:
        detected_classes = [model.names[int(cls)] for cls in result.boxes.cls]
        food_counts = dict(Counter(detected_classes))

        # Draw red bounding boxes
        for box in result.boxes.xyxy:
            x1, y1, x2, y2 = map(int, box)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 2)  # red box

    # Create output folder like YOLO
    save_dir = "runs/predict"
    os.makedirs(save_dir, exist_ok=True)

    output_path = os.path.join(save_dir, os.path.basename(image_path))
    cv2.imwrite(output_path, img)

    return food_counts


# Usage
my_plate = "apple.orange.jpg"
result_dict = count_food_items(my_plate)

print(f"Food List: {result_dict}")