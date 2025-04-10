"use client"

import { useEffect } from "react";
import io from "socket.io-client";
import { Button, Container } from "@mui/material";

export default function Admin() {
  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);
    return () => {
      socket.disconnect();
    };
  }, []);

  const handlePlayVideo = () => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);
    const startTime = Date.now();
    socket.emit('play-video', { startTime });
  };

  return (
    <Container>
      <h1>Administração</h1>
      <Button variant="contained" onClick={handlePlayVideo}>
        Iniciar Vídeo
      </Button>
    </Container>
  );
}