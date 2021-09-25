const express = require('express');
const app = express();
const serv = require('http').Server(app);
const io = require('socket.io')(serv, {});
const mysql = require('mysql2');

app.use(express.static(__dirname + '/scripts'));
app.use(express.static(__dirname + '/views'));
app.use(express.static(__dirname + '/styles'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/header', function(req, res) {
    res.sendFile(__dirname + '/views/header.html');
});

app.get('/leaderboard', function(req, res) {
    res.sendFile(__dirname + '/views/leaderboard.html');
});

app.get('/player', function(req, res) {
    res.sendFile(__dirname + '/views/player.html');
});

app.get('/report', function(req, res) {
    res.sendFile(__dirname + '/views/report.html');
});

app.get('/game', function(req, res) {
    res.sendFile(__dirname + '/views/game.html');
});

app.get('/games', function(req, res) {
    res.sendFile(__dirname + '/views/games.html');
});

const port = process.env.PORT || 8080;
serv.listen(port);
console.log("Server started on port", port);

let pool = mysql.createPool({
        host:'us-cdbr-east-04.cleardb.com',
        user:'b1e900371e10bc',
        password:'266123c4',
        database:'heroku_14bc27d717a8b78'});
if(port === 8080) {
    pool = mysql.createPool({
        host:'localhost',
        user:'root',
        password:'rootpass',
        database:'JustDanceDB'});
}


io.sockets.on('connection', function(socket) {
    socket.on('request-leaderboard', function(params) {
        if (params===null) {
            let query = "SELECT id, nickname, name, tags, rating FROM users ORDER BY rating DESC;";
            pool.query(query, function(err, results, fields) {
                socket.emit('return-leaderboard', results)
            });
        }
    });
    socket.on('request-player', function(id) {
        let query = "SELECT * FROM users WHERE id="+id+"";
        pool.query(query, function(err, results, fields) {
            let query2 = "SELECT * FROM games WHERE players REGEXP '^"+id+"' OR players REGEXP ';"+id+";' ORDER BY date DESC;";
            pool.query(query2, function(e, r, f) {
               socket.emit('return-player', [results, r]);
            });
        });
    });
    socket.on('request-game', function(id) {
        let query = "SELECT * FROM games WHERE id="+id+"";
        pool.query(query, function(err, results, fields) {
            let game_result = results[0];
            let players_list = game_result["players"].split(';');
            let player_info = [];
            function getPlayerForGame(i) {
                let player_id = players_list[i];
                pool.query("SELECT * FROM users WHERE id="+player_id, function(e, r, f) {
                    player_info.push(r);
                    if(player_info.length === players_list.length) {
                        socket.emit('return-game', results, player_info);
                    } else {
                        getPlayerForGame(i + 1);
                    }
                });
            }
            getPlayerForGame(0);
        });
    });
    socket.on('request-games', function(params) {
        if (params===null) {
            let query = "SELECT * FROM games ORDER BY date DESC;";
            pool.query(query, function(err, results, fields) {
                socket.emit('return-games', results)
            });
        }
    });
    socket.on('submit-game', function(players, song, location) {
        let query = "SELECT * FROM users";
        pool.query(query, function(err, results, fields) {
            let winner = "";
            function getPlayer(data, name, id_if_new) {
                for(let d in data) {
                    if(data[d]["nickname"]+" ("+data[d]["name"]+")"===name) {
                        if(winner === "") {
                            winner = data[d]["nickname"];
                        }
                        data[d]["new"] = false;
                        return data[d];
                    }
                }
                let newplayer_data = {
                    "nickname": "",
                    "name": "[Name Unknown]",
                    "rating": 1000,
                    "id":  id_if_new,
                    "new": true
                };
                if(name.includes("(") && name.includes(")")) {
                    const split_names = name.split("(");
                    newplayer_data["nickname"] = split_names[0].substr(0, split_names[0].length - 1);
                    newplayer_data["name"] = split_names[1].substr(0, split_names[1].length - 1);
                } else {
                    newplayer_data["nickname"] = name;
                }
                if(winner === "") {
                    winner = newplayer_data["nickname"];
                }
                pool.query("INSERT INTO users (id, nickname, name, rating) VALUES (" + newplayer_data["id"].toString() + ", '" + newplayer_data["nickname"] + "', '" + newplayer_data["name"] + "', " + newplayer_data["rating"].toString() + ");");
                return newplayer_data;
            }
            let max_id = results.length;
            let players_data = [];
            // console.log(players);
            for(let p in players) {
                let player_info = getPlayer(results, players[p], max_id + 1);
                if(player_info["new"]) max_id++;
                players_data.push(player_info);
            }
            // console.log(players_data);
            function getNewRating(player, all_players) {
                let old_rating = player["rating"];
                let new_rating = player["rating"];
                let passed_self = 0;
                for(let p in all_players) {
                    if(all_players[p]["id"]!==player["id"]) {
                        let b_rating = all_players[p]["rating"];
                        let expected_score = 1/(1+10 ** ((b_rating-old_rating)/400));
                        let K = 20;
                        let rating_change = K * (passed_self - expected_score);
                        new_rating = new_rating + rating_change;
                    } else {
                        passed_self = 1;
                    }
                }
                return new_rating
            }
            for(let p in players_data) {
                let new_rating = getNewRating(players_data[p], players_data);
                let query2 = "UPDATE users SET rating="+new_rating.toString()+" WHERE id="+players_data[p]["id"]+";";
                pool.query(query2);
            }
            let players_for_submission = "";
            for(let p in players_data) {
                players_for_submission = players_for_submission + players_data[p]["id"].toString()+";";
            }
            let query3 = "INSERT INTO games (players, song, location, winner) VALUES ('"+players_for_submission+"', '"+song+"', '"+location+"', '"+winner+"');";
            pool.query(query3, function(err, results, fields) {
                socket.emit('return-submit-game-changes');
            });
        });
    });
    socket.on('request-people-list', function() {
        let query = "SELECT nickname, name FROM users ORDER BY nickname;";
        pool.query(query, function(err, results, fields) {
            socket.emit('return-people-list', results);
        })
    });
    socket.on('request-songs-list', function() {
        pool.query("SELECT DISTINCT song FROM games;", function(err, results, fields) {
            socket.emit('return-songs-list', results);
        });
        pool.query("SELECT DISTINCT location FROM games;", function(err, results, fields) {
            socket.emit('return-locations-list', results);
        });
    });
    socket.on('request-player-name', function(id) {
        let query = "SELECT nickname FROM users WHERE id='"+id+"';";
        pool.query(query, function(err, results, fields) {
            socket.emit('return-player-name', results[0]['nickname']);
        })
    })
});