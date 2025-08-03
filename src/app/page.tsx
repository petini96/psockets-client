"use client"

import styles from "./page.module.css";
import io from "socket.io-client";
import { useEffect, useState } from "react";
import { Alert, AlertTitle, Avatar, Box, Button, Container, Grid } from "@mui/material";
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

export default function Home() {

  const [users, setUsers] = useState<User[]>([]);
  const [news, setNews] = useState<News>();

  useEffect(() => {
    const socket = io(`${process.env.NEXT_PUBLIC_API_HOST}`);

    socket.on('user-registered', (user: User) => {
      console.log(user);
      setUsers((prevUsers) => [...prevUsers, user]);
    });

    socket.on('news', (news: News) => {
      console.log(news);
      setNews(news);
    });

    return () => {
      socket.off('user-registered');
      socket.disconnect();
    };
  }, []);

  const chunkArray = (array: User[], size: number) => {
    const chunkedArray: User[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  return (
    <Container>
      <main className={styles.main}>
        <Grid container justifyContent={"center"} alignItems={"center"}>
          <Grid xs={5} item>
            <Image
              src={`fenix.svg`}
              width={100}
              height={100}
              alt="Picture of the author"
            />
          </Grid>
          <Grid xs={6} item>
            <h1> @psockets</h1>
          </Grid>
        </Grid>
        {news && (
          <Grid item sm={12} className="MuiCircularProgress-indeterminate">
            <Alert severity="warning">
              <AlertTitle sx={{ width: 100 }}>{news.title}</AlertTitle>
              {news.message}
            </Alert>
          </Grid>
        )}

        {chunkArray(users, 4).map((userGroup, index) => (
          <Box key={index}>
            <Grid container gap={1} alignItems={"center"} item marginY={3}>
              {userGroup.map((user, userIndex) => (
                <Grid item sm={3} key={userIndex}>
                  <div className="card">
                    {user.photo && (
                      <Avatar alt="Remy Sharp" src={ user.photo} sx={{ width: 65, height: 65 }} />
                    )}
                    {user.name}
                  </div>
                </Grid>
              ))}

              {userGroup.length === 4 && (
                <Box sx={{ width: "100%" }} alignItems={"center"} justifyContent={"center"}>
                  <Button variant="outlined" startIcon={<WhatshotIcon />} sx={{ padding: "10px" }}>
                    PRONTO
                  </Button>
                </Box>
              )}
              <hr />
            </Grid>
          </Box>
        ))}
      </main>
    </Container>
  );
}
