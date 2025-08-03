'use client';

import styles from '../page.module.css';
import io from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';
import { Alert, AlertTitle, Avatar, Box, Button, Container, Grid, Typography } from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';

type User = {
  id?: string;
  name: string;
  photo?: string;
  __v?: number;
};

type News = {
  id?: string;
  title: string;
  message: string;
};

export default function Revelation() {
  const [users, setUsers] = useState<User[]>([]);
  const [news, setNews] = useState<News>();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState<number>(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedSex, setSelectedSex] = useState<'boy' | 'girl' | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false); // Nova flag para rastrear se o vídeo já rodou
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_HOST}`, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO, ID:', socket.id);
    });

    socket.on('user-registered', (user: User) => {
      console.log('Usuário registrado recebido:', user);
      setUsers((prevUsers) => {
        if (!prevUsers.some((u) => u.id === user.id || u.name === user.name)) {
          return [...prevUsers, user];
        }
        return prevUsers;
      });
    });

    socket.on('news', (news: News) => {
      console.log('Notícia recebida:', news);
      setNews(news);
    });

    socket.on('play-video', (data: { startTime: number; sex: 'boy' | 'girl' }) => {
      // Ignorar evento se o vídeo já foi reproduzido
      if (hasPlayed) {
        console.log('Vídeo já reproduzido, ignorando evento play-video');
        return;
      }

      console.log('Evento play-video recebido com startTime:', data.startTime, 'sexo:', data.sex);
      setVideoPlaying(true);
      setVideoStartTime(data.startTime);
      setSelectedSex(data.sex);

      if (videoRef.current) {
        const currentTime = (Date.now() - data.startTime) / 1000;
        console.log('Tempo atual do vídeo:', currentTime);
        videoRef.current.currentTime = currentTime > 0 ? currentTime : 0;
        videoRef.current.play().catch((error) => {
          console.error('Erro ao reproduzir vídeo:', error);
        });
      } else {
        console.error('videoRef.current não está disponível');
      }
    });

    socket.on('sex-selected', (data: { sex: 'boy' | 'girl' }) => {
      console.log('Sexo recebido:', data.sex);
      setSelectedSex(data.sex);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('Erro do servidor:', data.message);
      alert(data.message);
    });

    socket.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
    });

    return () => {
      socket.off('connect');
      socket.off('user-registered');
      socket.off('news');
      socket.off('play-video');
      socket.off('sex-selected');
      socket.off('error');
      socket.off('disconnect');
      socket.disconnect();
      console.log('Socket.IO desconectado');
    };
  }, [hasPlayed]); // Adiciona hasPlayed como dependência

  const handleEnableAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setAudioEnabled(true);
    }
  };

  const handleVideoEnded = () => {
    console.log('Vídeo terminou, iniciando animação para sexo:', selectedSex);
    setVideoPlaying(false);
    setHasPlayed(true); // Marca o vídeo como reproduzido
    if (videoRef.current) {
      videoRef.current.pause(); // Garante que o vídeo pare
      videoRef.current.currentTime = 0; // Opcional: reseta o tempo do vídeo
    }
    if (selectedSex) {
      setShowAnimation(true); // Ativa a animação
    } else {
      console.error('Nenhum sexo selecionado para a animação');
    }
  };

  const handleCloseAnimation = () => {
    console.log('Fechando animação');
    setShowAnimation(false);
  };

  const chunkArray = (array: User[], size: number) => {
    const chunkedArray: User[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  return (
    <Box
      sx={{
        backgroundColor: '#E6F0FA',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: { xs: 2, md: 4 },
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
        <main className={styles.main}>
          {/* Botão de áudio */}
          {!audioEnabled && !videoPlaying && !hasPlayed && (
            <Box
              sx={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
              }}
            >
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleEnableAudio}
                sx={{
                  borderRadius: '25px',
                  padding: '15px 40px',
                  fontSize: '1.3rem',
                  backgroundColor: '#1976D2',
                  '&:hover': { backgroundColor: '#1565C0' },
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              >
                Habilitar Áudio
              </Button>
            </Box>
          )}

          {/* Vídeo */}
          {videoPlaying && !hasPlayed && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                my: 4,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  width: { xs: '100%', sm: '80%', md: '70%' },
                  maxWidth: '1000px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
                  backgroundColor: '#fff',
                }}
              >
                <video
                  ref={videoRef}
                  src="/video.mp4"
                  autoPlay
                  controls={false}
                  muted={!audioEnabled}
                  loop={false} // Impede o loop automático
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '65vh',
                    objectFit: 'cover',
                    borderRadius: '20px',
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  onEnded={handleVideoEnded}
                />
              </Box>
            </Box>
          )}

          {/* Animação de revelação */}
          {showAnimation && selectedSex && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background:
                  selectedSex === 'boy'
                    ? 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)'
                    : 'linear-gradient(135deg, #FF69B4 0%, #F06292 100%)',
                zIndex: 2000,
                animation: 'fadeIn 1s ease-in',
                border: '10px solid #fff',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
              }}
            >
              <Box sx={{ textAlign: 'center', position: 'relative' }}>
                <Typography
                  variant="h1"
                  sx={{
                    color: '#fff',
                    fontWeight: 'bold',
                    mb: 4,
                    textShadow: '0 4px 8px rgba(0,0,0,0.4)',
                    animation: 'popIn 0.5s ease-out',
                  }}
                >
                  {selectedSex === 'boy' ? 'É um Menino!' : 'É uma Menina!'}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleCloseAnimation}
                  sx={{
                    borderRadius: '15px',
                    padding: '10px 30px',
                    fontSize: '1.2rem',
                    backgroundColor: '#fff',
                    color: selectedSex === 'boy' ? '#2196F3' : '#FF69B4',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                  }}
                >
                  Fechar
                </Button>
                <Box className="confetti">
                  {[...Array(100)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        position: 'absolute',
                        width: `${5 + Math.random() * 10}px`,
                        height: `${5 + Math.random() * 10}px`,
                        backgroundColor:
                          selectedSex === 'boy'
                            ? ['#2196F3', '#64B5F6', '#BBDEFB', '#E3F2FD'][Math.floor(Math.random() * 4)]
                            : ['#FF69B4', '#F06292', '#FCE4EC', '#FFCDD2'][Math.floor(Math.random() * 4)],
                        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animation: `fall ${1 + Math.random() * 3}s linear infinite`,
                        animationDelay: `${Math.random() * 2}s`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {/* Estilos da animação */}
          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes popIn {
              0% { transform: scale(0); opacity: 0; }
              80% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes fall {
              0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
          `}</style>

          {/* Notícias */}
          {news && (
            <Grid item xs={12} sx={{ my: 3, maxWidth: '800px', mx: 'auto' }}>
              <Alert
                severity="warning"
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#FFF3E0',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}
              >
                <AlertTitle sx={{ fontWeight: 'bold', color: '#E65100' }}>
                  {news.title}
                </AlertTitle>
                <Typography sx={{ color: '#E65100' }}>{news.message}</Typography>
              </Alert>
            </Grid>
          )}

          {/* Lista de usuários */}
          {chunkArray(users, 4).map((userGroup, index) => (
            <Box key={index} sx={{ my: 4, maxWidth: '1200px', mx: 'auto' }}>
              <Grid container spacing={3} alignItems="center">
                {userGroup.map((user, userIndex) => (
                  <Grid item xs={12} sm={6} md={3} key={userIndex}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        backgroundColor: '#FFFFFF',
                        padding: '20px',
                        borderRadius: '15px',
                        boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.05)' },
                      }}
                    >
                      {user.photo && (
                        <Avatar
                          alt={user.name}
                          src={user.photo}
                          sx={{ width: 90, height: 90, margin: '0 auto', mb: 1 }}
                        />
                      )}
                      <Typography sx={{ fontWeight: 'medium', color: '#333' }}>
                        {user.name}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
                {userGroup.length === 4 && (
                  <Grid item xs={12} textAlign="center">
                    <Button
                      variant="outlined"
                      startIcon={<WhatshotIcon />}
                      sx={{
                        mt: 3,
                        borderColor: '#FF6F61',
                        color: '#FF6F61',
                        borderRadius: '10px',
                        padding: '10px 20px',
                        '&:hover': {
                          borderColor: '#FF4D4D',
                          color: '#FF4D4D',
                          backgroundColor: 'rgba(255,77,77,0.05)',
                        },
                      }}
                    >
                      PRONTO
                    </Button>
                  </Grid>
                )}
              </Grid>
              <hr style={{ border: '1px dashed #B0BEC5', margin: '30px 0' }} />
            </Box>
          ))}
        </main>
      </Container>
    </Box>
  );
}