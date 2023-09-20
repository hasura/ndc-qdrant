# Use the official Python image from the Docker Hub
FROM python:3.10-slim-buster

# Set the working directory
WORKDIR /usr/src/app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code into the container
COPY ./app.py .

# Set the environment variable to ensure that Python outputs everything to the terminal
ENV PYTHONUNBUFFERED=1

# Set the command to run your application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8102"]
