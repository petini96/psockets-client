"use client"

import { Button, Container, Grid, TextField, styled } from "@mui/material";
import styles from "../../page.module.css";
import * as React from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios, { AxiosError, AxiosResponse } from 'axios'; 

type User = {
    id?: string;
    name: string;
    photo?: string;
}

interface UploadResponse {
    name: string;
    photo: string;
}

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

export default function Cadastro() {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [name, setName] = React.useState<string>("");

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleSubmit = () => {
        if (selectedFile) {

            const formData = new FormData();
            formData.append("name", name);
            formData.append("file", selectedFile);
            const host = "http://api.psockets.roboticsmind.com.br" 
            axios.post<UploadResponse>(host + "/users", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
                .then((response: AxiosResponse<UploadResponse>) => {
                    console.log(response.data);
                })
                .catch((error: AxiosError) => {
                    if (error.response) {
                        // A resposta do servidor está fora do intervalo de 2xx
                        console.error('Error response:', error.response.data);
                    } else if (error.request) {
                        // A solicitação foi feita mas não houve resposta
                        console.error('Error request:', error.request);
                    } else {
                        // Algo aconteceu na configuração da solicitação que desencadeou um erro
                        console.error('Error message:', error.message);
                    }
                });
        } else {
            console.error("File input element or files not found.");
        }
    };

    return (
        <main className={styles.main}>
            <Container>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <h1>Cadastro</h1>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            id="name"
                            name="name"
                            label="Digite o nome"
                            variant="outlined"
                            fullWidth
                            onChange={(e) => { setName(e.target.value) }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <input
                            type="file"
                            name="photo"
                            id="photo"
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="contained"
                            startIcon={<CloudUploadIcon />}
                            onClick={handleSubmit}
                            sx={{ width: "100%", marginTop: "20px" }}
                        >
                            Upload file
                        </Button>
                    </Grid>
                </Grid>
            </Container>
        </main>
    );
}
