"use client"

import styles from "../../../page.module.css";
import { useEffect, useState } from "react";
import { Avatar, Box, Container, Grid } from "@mui/material";
import Image from 'next/image'
import { User } from "@/app/model/user/User";

export default function UserListing() {

    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {

    }, []);

    return (
        <Container>
            <main className={styles.main}>
                <Grid container justifyContent={"center"} alignItems={"center"}>
                    <Grid xs={5} item>
                        <Image
                            src={`../../fenix.svg`}
                            width={100}
                            height={100}
                            alt="Picture of the author"
                        />
                    </Grid>
                    <Grid xs={6} item>
                        <h1>Usuários</h1>
                    </Grid>
                </Grid>

                {users.map((user, index) => (
                    <Box key={index}>
                        <Grid container gap={1} alignItems={"center"} item marginY={3}>
                            <Grid item sm={3} key={index}>
                                <div className="card">
                                    {user.photo && (
                                        <Avatar alt="Remy Sharp" src={user.photo} sx={{ width: 65, height: 65 }} />
                                    )}
                                    {user.name}
                                </div>
                            </Grid>
                            <hr />
                        </Grid>
                    </Box>
                ))}
            </main>
        </Container>
    );
}
