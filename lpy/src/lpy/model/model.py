import click
import os
import subprocess
import signal
from typing import Any
from keras.api.models import load_model
from flask import Flask, request, jsonify
import numpy as np
import tensorflow as tf
from keras.src.layers.core.dense import Dense
from keras.api.models import Sequential

"""
    usage: model train --epochs 20 --batch-size 64 --model-path /app/model_checkpoint.h5

"""

app = Flask(__name__)
model = Any

@click.group()
def model():
    pass

def create_model(input_shape):
    model = Sequential([
        Dense(64, activation='relu', input_shape=input_shape),
        Dense(64, activation='relu'),
        Dense(3, activation='softmax')
    ])
    return model

# Route for predictions
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    input_data = np.array(data['input']).reshape(1, -1)  # Adjust shape as needed
    prediction = model.predict(input_data)
    return jsonify({'prediction': prediction.tolist()})

@model.command()
@click.option('--epochs', default=10, help='Number of epochs for training.')
@click.option('--batch-size', default=32, help='Batch size for training.')
@click.option('--model-path', default='model_checkpoint.h5', help='Path to save the trained model.')
def train(epochs, batch_size, model_path):
    """Train the model."""
    # Example model training logic
    from sklearn.datasets import load_iris
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler

    # Load dataset
    data = load_iris()
    X = data.data
    y = data.target

    # Preprocess data
    scaler = StandardScaler()
    X = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Define model
    model = Sequential([
        Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
        Dense(64, activation='relu'),
        Dense(3, activation='softmax')
    ])

    # Compile model
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

    # Train model
    model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, validation_split=0.2)

    # Save model
    model.save(model_path)
    click.echo(f"Model trained and saved to {model_path}")

@cli.command()
@click.option('--model-path', default='model_checkpoint.h5', help='Path to the model file.')
def start(model_path):
    """Start the model service."""
    global model
    model = load_model(model_path)
    app.run(host='0.0.0.0', port=5000)

@cli.command()
@click.argument('pid', type=int)
def stop(pid):
    """Stop the model service."""
    try:
        os.kill(pid, signal.SIGTERM)
        click.echo(f"Service with PID {pid} stopped.")
    except ProcessLookupError:
        click.echo(f"No process found with PID {pid}.")

if __name__ == '__main__':
    model()
