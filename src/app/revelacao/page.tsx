"use client"

import styles from "../page.module.css";
import io from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import { Alert, AlertTitle, Avatar, Box, Button, Container, Grid, Typography } from "@mui/material";
import WhatshotIcon from '@mui/icons-material/Whatshot';
import Image from 'next/image'

type User = {
  id?: string
  name: string
  photo?: string
  __v?: number
}

type News = {
  id?: string
  title: string
  message: string
}

export default function Revelation() {
  const [users, setUsers] = useState<User[]>([]);
  const [news, setNews] = useState<News>();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);
    socket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO');
    });
    // ... resto do código
  }, []);
  
  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);

    socket.on('user-registered', (user: User) => {
      console.log('Usuário registrado:', user);
      setUsers((prevUsers) => [...prevUsers, user]);
    });

    socket.on('news', (news: News) => {
      console.log('Notícia recebida:', news);
      setNews(news);
    });

    socket.on('play-video', (data: { startTime: number }) => {
      console.log('Evento play-video recebido com startTime:', data.startTime);
      setVideoPlaying(true);
      setVideoStartTime(data.startTime);

      // Garantir que o vídeo seja iniciado e sincronizado
      if (videoRef.current) {
        const currentTime = (Date.now() - data.startTime) / 1000;
        console.log('Tempo atual do vídeo:', currentTime);
        videoRef.current.currentTime = currentTime > 0 ? currentTime : 0; // Evita tempo negativo
        videoRef.current.play().catch((error) => {
          console.error("Erro ao reproduzir vídeo:", error);
        });
      } else {
        console.error("videoRef.current não está disponível");
      }
    });

    return () => {
      socket.off('user-registered');
      socket.off('news');
      socket.off('play-video');
      socket.disconnect();
    };
  }, []);

  // Adicionar um useEffect para monitorar mudanças no videoRef e iniciar o vídeo se necessário
  useEffect(() => {
    if (videoPlaying && videoRef.current && videoStartTime) {
      const currentTime = (Date.now() - videoStartTime) / 1000;
      videoRef.current.currentTime = currentTime > 0 ? currentTime : 0;
      videoRef.current.play().catch((error) => {
        console.error("Erro ao reproduzir vídeo após videoRef estar disponível:", error);
      });
    }
  }, [videoPlaying, videoStartTime]);

  const handleEnableAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setAudioEnabled(true);
    }
  };

  const chunkArray = (array: User[], size: number) => {
    const chunkedArray: User[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  return (
    <Container maxWidth={false} sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <main className={styles.main}>
        <Grid container justifyContent="center" alignItems="center" sx={{ py: 2 }}>
          <Grid item xs={12} textAlign="center">
            <Image
              src="/fenix.svg"
              width={120}
              height={120}
              alt="Fênix"
              style={{ marginBottom: '10px' }}
            />
            <Typography variant="h2" sx={{ fontFamily: 'cursive', color: '#ff6f61' }}>
              Chá Revelação
            </Typography>
          </Grid>
        </Grid>

        {!audioEnabled && (
          <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleEnableAudio}
              sx={{ borderRadius: '20px', padding: '15px 30px', fontSize: '1.2rem' }}
            >
              Entrar na Revelação (Habilitar Áudio)
            </Button>
          </Box>
        )}

        {videoPlaying && (
          <Grid item xs={12} sx={{ my: 4 }}>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto',
                borderRadius: '15px',
                overflow: 'hidden',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
              }}
            >
              <video
                ref={videoRef}
                src="/video.mp4"
                autoPlay
                loop
                controls={false}
                muted={!audioEnabled}
                style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'cover' }}
                onContextMenu={(e) => e.preventDefault()}
              />
            </Box>
          </Grid>
        )}

        {news && (
          <Grid item xs={12} sx={{ my: 2 }}>
            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
              <AlertTitle sx={{ fontWeight: 'bold' }}>{news.title}</AlertTitle>
              {news.message}
            </Alert>
          </Grid>
        )}

        {chunkArray(users, 4).map((userGroup, index) => (
          <Box key={index} sx={{ my: 3 }}>
            <Grid container spacing={2} alignItems="center">
              {userGroup.map((user, userIndex) => (
                <Grid item xs={12} sm={3} key={userIndex}>
                  <Box
                    sx={{
                      textAlign: 'center',
                      backgroundColor: '#fff',
                      padding: '15px',
                      borderRadius: '10px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    {user.photo && (
                      <Avatar
                        alt={user.name}
                        src={user.photo}
                        sx={{ width: 80, height: 80, margin: '0 auto' }}
                      />
                    )}
                    <Typography sx={{ mt: 1, fontWeight: 'medium' }}>{user.name}</Typography>
                  </Box>
                </Grid>
              ))}
              {userGroup.length === 4 && (
                <Grid item xs={12} textAlign="center">
                  <Button
                    variant="outlined"
                    startIcon={<WhatshotIcon />}
                    sx={{
                      mt: 2,
                      borderColor: '#ff6f61',
                      color: '#ff6f61',
                      '&:hover': { borderColor: '#ff4d4d', color: '#ff4d4d' },
                    }}
                  >
                    PRONTO
                  </Button>
                </Grid>
              )}
            </Grid>
            <hr style={{ border: '1px dashed #ddd', margin: '20px 0' }} />
          </Box>
        ))}
      </main>
    </Container>
  );
}