// Updated FaceAuth.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs'; 


const FaceAuth = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [authResult, setAuthResult] = useState({ person: '', distance: null });
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendReady, setBackendReady] = useState(true);
  const [model, setModel] = useState(null);

  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
      console.log("✅ COCO-SSD model loaded.");
    };
    loadModel();
  }, []);

  useEffect(() => {
    const setupWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        console.log("✅ Webcam started");
      } catch (err) {
        console.error("❌ Webcam error:", err);
        setError("Unable to access webcam");
      }
    };
    setupWebcam();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isProcessing && backendReady && model) {
        captureAndRecognize();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isProcessing, backendReady, model]);

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current || !model) return;

    setIsProcessing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const predictions = await model.detect(video);
    const people = predictions.filter(p => p.class === 'person' && p.score > 0.5);

    if (people.length !== 1) {
      console.log(`🚫 Invalid number of people detected (${people.length}).`);
      setIsProcessing(false);
      return;
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error("❌ Failed to capture image blob");
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      try {
        const response = await axios.post('https://allowing-tapir-remarkably.ngrok-free.app/recognize', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const { match, person, distance } = response.data;
        setBackendReady(true);

        if (match) {
          console.log(`✅ Face matched: ${person} (distance: ${distance})`);
          setAuthResult({ person, distance });
          await markAttendance(person, distance);
        } else {
          console.log("❌ Face not matched.");
          setAuthResult({ person: '', distance: null });
        }
      } catch (err) {
        console.error("❌ Backend error:", err);
        setError("Failed to recognize face");
      } finally {
        setIsProcessing(false);
      }
    }, 'image/jpeg');
  };

  const markAttendance = async (name, distance) => {
    try {
      const res = await axios.post('/api/mark', {
        name,
        distance,
      });

      console.log("📌 Attendance marked:", res.data.message);
    } catch (err) {
      console.error("❌ Error marking attendance:", err);
      setError("Failed to mark attendance");
    }
  };

  return (
    <div className="container">
      <h2 className="heading">🎓 Student Authentication</h2>
      <div className="video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="video"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      <div className="result">
        {authResult.person ? (
          <h3>
             Recognized: {authResult.person} <br />
             Distance: {authResult.distance?.toFixed(4)}
          </h3>
        ) : (
          <h3>👤 No recognized face detected yet</h3>
        )}
        {error && <p className="error">⚠️ {error}</p>}
      </div>
    </div>
  );
};

export default FaceAuth;



// python3 app.py --host=0.0.0.0 --port=5000
// source venv/bin/activate
// ngrok http --domain=allowing-tapir-remarkably.ngrok-free.app 5000
