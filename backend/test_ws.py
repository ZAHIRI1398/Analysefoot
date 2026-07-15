import asyncio
import json
import base64
import os
import websockets
import cv2
import numpy as np


def make_test_image(path=None):
    # If a file exists at path, use it. Otherwise generate a simple image.
    if path and os.path.exists(path):
        img = cv2.imread(path)
        if img is not None:
            return img

    h, w = 640, 960
    img = np.zeros((h, w, 3), dtype=np.uint8)
    # draw a green rectangle (simulates a player)
    cv2.rectangle(img, (200, 150), (300, 400), (0, 255, 0), -1)
    # draw a white circle (simulates ball)
    cv2.circle(img, (600, 320), 20, (255, 255, 255), -1)
    return img


def encode_image_to_data_url(img):
    _, buf = cv2.imencode('.jpg', img)
    b64 = base64.b64encode(buf.tobytes()).decode('ascii')
    return f'data:image/jpeg;base64,{b64}'


async def run():
    uri = "ws://127.0.0.1:8002/ws/analyze"
    try:
        img = make_test_image()
        data_url = encode_image_to_data_url(img)

        async with websockets.connect(uri) as ws:
            print("CONNECTED")
            payload = {"image": data_url, "timestamp": 123}
            print("SENDING payload (size):", len(payload['image']))
            await ws.send(json.dumps(payload))
            print("WAITING FOR RESPONSE...")
            try:
                resp = await asyncio.wait_for(ws.recv(), timeout=20)
                print("RESPONSE:", resp)
            except asyncio.TimeoutError:
                print("ERROR: timed out waiting for server response")
    except Exception as e:
        print("ERROR:", repr(e))


if __name__ == "__main__":
    asyncio.run(run())
