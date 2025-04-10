"use client"

import { useEffect, useState } from "react";
import { Box, Button, Container, Grid, Typography } from "@mui/material";
import axios from 'axios';

interface Option {
    id: number;
    text: string;
    votes: number;
}

interface Question {
    id: string;
    options: Option[];
    totalVotes: number;
}

export default function Choice() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [hasVoted, setHasVoted] = useState<boolean>(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await axios.get('http://192.168.100.103:5000/api/questions');
                const fetchedQuestions: Question[] = response.data;
                console.log("Perguntas recebidas:", fetchedQuestions);
                setQuestions(fetchedQuestions);
            } catch (error) {
                console.error("Erro ao buscar perguntas:", error);
            }
        };

        fetchQuestions();
    }, []);

    const handleOptionSelect = async (optionId: number) => {
        if (hasVoted) {
            // Se já votou, o segundo clique avança para a próxima pergunta
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setSelectedOption(null);
                setHasVoted(false);
            }
            return;
        }

        setSelectedOption(optionId);
        setHasVoted(true);

        try {
            const response = await axios.post(`http://192.168.100.103:5000/api/questions/${currentQuestion.id}/vote`, {
                optionId,
            });
            const updatedQuestion: Question = response.data;

            // Atualiza a pergunta atual com os novos dados de votos
            setQuestions(questions.map((q, index) =>
                index === currentQuestionIndex ? updatedQuestion : q
            ));
        } catch (error) {
            console.error("Erro ao registrar voto:", error);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            setSelectedOption(null);
            setHasVoted(false);
        }
    };

    const currentQuestion = questions[currentQuestionIndex];

    const calculatePercentage = (votes: number | undefined, totalVotes: number | undefined): number => {
        const safeVotes = votes ?? 0; // Usa 0 se votes for undefined
        const safeTotalVotes = totalVotes ?? 0; // Usa 0 se totalVotes for undefined
        if (safeTotalVotes === 0) return 0;
        return Math.round((safeVotes / safeTotalVotes) * 100);
    };

    return (
        <Container maxWidth={false} sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
            <Box textAlign="center" mb={4}>
                <Typography variant="h2" sx={{ fontFamily: 'cursive', color: '#ff6f61' }}>
                    Escolha Sua Jornada
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 1, color: '#666' }}>
                    Qual caminho você prefere seguir? (Pergunta {currentQuestionIndex + 1} de {questions.length})
                </Typography>
            </Box>

            {questions.length > 0 ? (
                <>
                    <Grid container spacing={4} justifyContent="center">
                        {currentQuestion.options.map((option) => (
                            <Grid item xs={12} sm={6} key={option.id}>
                                <Box
                                    sx={{
                                        backgroundColor: selectedOption === option.id ? '#ff6f61' : '#fff',
                                        color: selectedOption === option.id ? '#fff' : '#000',
                                        padding: '30px',
                                        borderRadius: '15px',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            backgroundColor: selectedOption === option.id ? '#ff6f61' : '#f0f0f0',
                                        },
                                    }}
                                    onClick={() => handleOptionSelect(option.id)}
                                >
                                    <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
                                        {option.text}
                                    </Typography>
                                    {hasVoted && (
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            {calculatePercentage(option.votes, currentQuestion.totalVotes)}% ({option.votes} votos)
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    {/* <Box textAlign="center" mt={4}>
                        <Button
                            variant="contained"
                            sx={{
                                backgroundColor: '#ff6f61',
                                '&:hover': { backgroundColor: '#ff4d4d' },
                                borderRadius: '20px',
                                padding: '10px 30px',
                                marginRight: '10px',
                            }}
                            onClick={handlePreviousQuestion}
                            disabled={currentQuestionIndex === 0}
                        >
                            Anterior
                        </Button>
                    </Box> */}

                    {hasVoted && (
                        <Box textAlign="center" mt={4}>
                            <Button
                                variant="contained"
                                sx={{
                                    backgroundColor: '#ff6f61',
                                    '&:hover': { backgroundColor: '#ff4d4d' },
                                    borderRadius: '20px',
                                    padding: '10px 30px',
                                }}
                                onClick={() => {
                                    setSelectedOption(null);
                                    setHasVoted(false);
                                }}
                            >
                                Escolher Novamente
                            </Button>
                        </Box>
                    )}
                </>
            ) : (
                <Typography textAlign="center" color="textSecondary">
                    Carregando opções...
                </Typography>
            )}
        </Container>
    );
}