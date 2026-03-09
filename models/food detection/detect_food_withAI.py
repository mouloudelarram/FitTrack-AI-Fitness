from ultralytics import YOLO
from collections import Counter

def count_food_items(image_path):
    # Load the model
    model = YOLO("yolov8n.pt") 

    # Run inference
    results = model.predict(source=image_path, conf=0.25, save=False, verbose=False)

    food_counts = {}

    for result in results:
        # Extract all detected class names as a list
        detected_classes = [model.names[int(cls)] for cls in result.boxes.cls]
        
        # Count occurrences of each class
        food_counts = dict(Counter(detected_classes))

    return food_counts

# Usage
my_plate = "apple.orange.jpg"
result_dict = count_food_items(my_plate)

print(f"Food List: {result_dict}")