"use client"

import { Button, Container, Grid, TextField, Typography } from "@mui/material";
import styles from "../../../page.module.css";
import * as React from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';

interface QuestionResponse {
  id: number;
  options: { id: number; text: string }[];
}

export default function Cadastro() {
  const [option1, setOption1] = React.useState<string>("");
  const [option2, setOption2] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    if (!option1 || !option2) {
      setError("Por favor, preencha ambas as opções.");
      setSuccess(null);
      return;
    }

    const data = {
      options: [option1, option2],
    };

    try {
      const response: AxiosResponse<QuestionResponse> = await axios.post(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/questions`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log("Pergunta cadastrada:", response.data);
      setSuccess("Pergunta cadastrada com sucesso!");
      setError(null);
      // Limpa os campos após o cadastro
      setOption1("");
      setOption2("");
    } catch (error) {
      setSuccess(null);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          setError(`Erro: ${axiosError.response.data?.error || "Falha ao cadastrar a pergunta."}`);
        } else {
          setError("Erro de conexão com o servidor.");
        }
      } else {
        setError("Erro desconhecido ao cadastrar a pergunta.");
      }
      console.error("Erro ao cadastrar pergunta:", error);
    }
  };

  return (
    <main className={styles.main}>
      <Container maxWidth="sm">
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h4" align="center" gutterBottom sx={{ color: '#ff6f61', fontFamily: 'cursive' }}>
              Cadastro de Perguntas
            </Typography>
            <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
              Insira duas opções para a pergunta de escolha.
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              id="option1"
              name="option1"
              label="Primeira Opção"
              variant="outlined"
              fullWidth
              value={option1}
              onChange={(e) => setOption1(e.target.value)}
              placeholder="Ex.: Tenha uma carreira longa e gratificante com sucesso modesto"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              id="option2"
              name="option2"
              label="Segunda Opção"
              variant="outlined"
              fullWidth
              value={option2}
              onChange={(e) => setOption2(e.target.value)}
              placeholder="Ex.: Carreira curta, mas altamente bem-sucedida"
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Typography color="error" align="center">
                {error}
              </Typography>
            </Grid>
          )}

          {success && (
            <Grid item xs={12}>
              <Typography color="success.main" align="center">
                {success}
              </Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                width: "100%",
                backgroundColor: '#ff6f61',
                '&:hover': { backgroundColor: '#ff4d4d' },
                borderRadius: '20px',
                padding: '10px 0',
              }}
            >
              Cadastrar Pergunta
            </Button>
          </Grid>
        </Grid>
      </Container>
    </main>
  );
}