"use client"

import { useEffect, useState } from "react";
import io from "socket.io-client";
import { Button, Container, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";

export default function Admin() {
  const [sex, setSex] = useState<'boy' | 'girl' | ''>('');
  const [isSexSaved, setIsSexSaved] = useState(false);

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);

    socket.on('connect', () => {
      console.log('Admin conectado ao Socket.IO');
    });

    socket.on('sex-selected', (data: { sex: 'boy' | 'girl' }) => {
      console.log('Sexo recebido:', data.sex);
      setSex(data.sex);
      setIsSexSaved(true);
    });

    // Verificar sexo atual ao carregar
    fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/sex`)
      .then((res) => res.json())
      .then((data) => {
        if (data.sex) {
          setSex(data.sex);
          setIsSexSaved(true);
        }
      })
      .catch((err) => console.error('Erro ao verificar sexo:', err));

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSexChange = async (newSex: 'boy' | 'girl') => {
    setSex(newSex);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/sex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sex: newSex }),
      });
      if (response.ok) {
        console.log('Sexo salvo com sucesso');
        setIsSexSaved(true);
      } else {
        console.error('Erro ao salvar sexo');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
    }
  };

  const handlePlayVideo = () => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);
    const startTime = Date.now();
    socket.emit('play-video', { startTime });
  };

  return (
    <Container sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h4" sx={{ mb: 4, color: '#333' }}>
        Administração - Chá Revelação
      </Typography>
      <FormControl sx={{ minWidth: 200, mb: 4 }}>
        <InputLabel id="sex-select-label">Selecionar Sexo</InputLabel>
        <Select
          labelId="sex-select-label"
          value={sex}
          label="Selecionar Sexo"
          onChange={(e) => handleSexChange(e.target.value as 'boy' | 'girl')}
          sx={{ borderRadius: '10px', backgroundColor: '#fff' }}
        >
          <MenuItem value="boy">Menino</MenuItem>
          <MenuItem value="girl">Menina</MenuItem>
        </Select>
      </FormControl>
      <Button
        variant="contained"
        onClick={handlePlayVideo}
        disabled={!isSexSaved}
        sx={{
          borderRadius: '15px',
          padding: '12px 30px',
          fontSize: '1.2rem',
          backgroundColor: isSexSaved ? '#1976D2' : '#B0BEC5',
          '&:hover': { backgroundColor: isSexSaved ? '#1565C0' : '#B0BEC5' },
        }}
      >
        Iniciar Vídeo
      </Button>
    </Container>
  );
}