const socket = io();

function showRecentGames() {
    $("#main-body").load("games");
}

function setupRecentGames() {
    socket.emit('request-games', null);
    socket.on('return-games', function(data) {
        socket.off('return-games');
        let games_table = document.getElementById("leaderboard-table");
        games_table.innerHTML =
            "<tr id=\"leaderboard-table-header\" class=\"leaderboard-row\">"+
            "        <td class=\"gms-date\">Date</td>\n" +
            "        <td class=\"gms-time\">Time</td>\n" +
            "        <td class=\"gms-song\">Song</td>"+
            "        <td class=\"gms-loc\">Location</td>" +
            "        <td class=\"gms-winner\">Winner</td>"+
            "</tr>";
        for(let i in data) {
            let game_data = data[i];
            if(game_data["location"] === null) {
                game_data["location"] = "";
            }
            let time = ((parseInt(game_data["date"].substr(11,2))-4)%12).toString() + game_data["date"].substr(13,3);
            if(time === "0") {
                time = "12";
            }
            if((parseInt(game_data["date"].substr(11,2))-4) < 12) {
                time = time + " AM";
            } else {
                time = time + " PM";
            }
            let date = game_data["date"].substr(5, 2) + "/" + game_data["date"].substr(8, 2) + "/" + game_data["date"].substr(2, 2);
            let row_html = "<tr class='leaderboard-row' onclick='openGamePage("+game_data["id"]+");'>" +
                "        <td class='gms-date'>"+date+"</td>" +
                "        <td class='gms-time'>"+time+"</td>" +
                "        <td class='gms-song'>"+game_data["song"]+"</td>" +
                "        <td class='gms-loc' style='display: inline-flex'>"+ game_data["location"] +"</td>"+
                "        <td class='gms-winner'>"+game_data["winner"]+"</td></tr>";
            games_table.innerHTML = games_table.innerHTML + row_html;
        }
    });
    sessionStorage.setItem('page', 'games')
}

function showLeaderboard() {
    $("#main-body").load("leaderboard");
}

function setupLeaderboard() {
    socket.emit('request-leaderboard', null);
    socket.on('return-leaderboard', function(data) {
        socket.off('return-leaderboard');
        let leaders_table = document.getElementById("leaderboard-table");
        leaders_table.innerHTML = "<tr id=\"leaderboard-table-header\" class=\"leaderboard-row\">"+
            "<td class=\"ldb-rank\">Rank</td>\n" +
            "        <td class=\"ldb-player\">Player</td>\n" +
            "        <td class=\"ldb-rating\">Rating</td>"+
            "</tr>";
        const sp = "&nbsp;&nbsp;&nbsp;";
        for(let i in data) {
            let player_data = data[i];
            let rank = parseInt(i) + 1;
            let row_html = "<tr class='leaderboard-row' onclick='openPlayerProfile("+player_data["id"]+");'>" +
                "        <td class='ldb-rank'>"+rank.toString()+"</td>" +
                "        <td class='ldb-player' style='display: inline-flex'>" +
                "           <div class='ldb-player-nick'>"+player_data["nickname"]+"</div>" +
                "           <div class='ldb-player-full'>"+sp+player_data["name"]+"</div>" +
                "           <div class='ldb-player-tags' id='player-tags-"+player_data["id"]+"'>"+sp+"</div></td>"+
                "        <td class='ldb-rating'>"+player_data["rating"]+"</td></tr>";
            leaders_table.innerHTML = leaders_table.innerHTML + row_html;

            let tags_container = document.getElementById("player-tags-"+player_data["id"]);
            let tags_raw = player_data["tags"];
            if(tags_raw !== null) {
                let tags = tags_raw.split(';');
                for(let t in tags) {
                    let tag = tags[t];
                    tags_container.innerHTML = tags_container.innerHTML + "&nbsp;" +
                        "<div class='ldb-player-tag "+tag+"'>"+tag+"</div>";
                }
            }
        }
    });
    sessionStorage.setItem('page', 'leaderboard')
}

function openSubmitGame() {
    $("#main-body").load("report");
    sessionStorage.setItem('page', 'report')
}

function submitGame() {
    let player_names = [];
    for(let i in [1, 2, 3, 4, 5, 6]) {
        let j = parseInt(i)+1;
        let player_name = document.getElementById('playername'+j.toString()).value;
        if(player_name !== "") {
            player_names.push(player_name);
        }
    }
    let song = document.getElementById('song-input').value;
    let location = document.getElementById('location-input').value;
    socket.emit('submit-game', player_names, song, location);
    socket.on('return-submit-game-changes', function(data) {
        window.location.reload()
    });
}

function openPlayerProfile(id) {
    $("#main-body").load("player");
    sessionStorage.setItem("opened_player_id", id)
}

function setupPlayerProfile() {
    let id = sessionStorage.getItem("opened_player_id");
    sessionStorage.removeItem('opened_player_id');
    socket.emit('request-player', id);
    socket.on('return-player', function(results) {
        socket.off('return-player')
        let data = results[0];
        let games = results[1];
        document.getElementById('player-nickname').innerText = data[0]["nickname"];
        document.getElementById('player-name').innerText = data[0]["name"];
        document.getElementById('player-rating').innerText = data[0]["rating"];
        let tags_container = document.getElementById("player-tags");
        tags_container.innerHTML = "";
        let tags_raw = data[0]["tags"];
        if(tags_raw !== null) {
            let tags = tags_raw.split(';');
            for(let t in tags) {
                let tag = tags[t];
                tags_container.innerHTML = tags_container.innerHTML + "&nbsp;" +
                    "<div class='player-page-tag "+tag+"'>"+tag+"</div>";
            }
        }
        let games_table = document.getElementById("leaderboard-table");
        games_table.innerHTML =
            "<tr id=\"leaderboard-table-header\" class=\"leaderboard-row\">"+
            "        <td class=\"gms-date\">Date</td>\n" +
            "        <td class=\"gms-time\">Time</td>\n" +
            "        <td class=\"gms-song\">Song</td>"+
            "        <td class=\"gms-loc\">Location</td>" +
            "        <td class=\"gms-winner\">Winner</td>"+
            "        <td class=\"gms-place\" id='gms-place-header'>Place</td>"+
            "</tr>";
        const place_colors = ["#D4AF37", "#C0C0C0", "#CD7F32", "#B85A2A", "#542a10", "#000000"];
        for(let i in games) {
            let game_data = games[i];
            if(game_data["location"] === null) {
                game_data["location"] = "";
            }
            let time = ((parseInt(game_data["date"].substr(11,2))-4)%12).toString() + game_data["date"].substr(13,3);
            if((parseInt(game_data["date"].substr(11,2))-4) < 12) {
                time = time + " AM";
            } else {
                time = time + " PM";
            }
            let date = game_data["date"].substr(5, 2) + "/" + game_data["date"].substr(8, 2) + "/" + game_data["date"].substr(2, 2);
            let game_players = game_data["players"].split(';');
            let my_place = 0;
            for(let rank in game_players) {
                if(game_players[rank] === id) {
                    my_place = parseInt(rank) + 1;
                    break;
                }
            }
            let place_color = place_colors[my_place - 1];
            let row_html = "<tr class='leaderboard-row' onclick='openGamePage("+game_data["id"]+");'>" +
                "        <td class='gms-date'>"+date+"</td>" +
                "        <td class='gms-time'>"+time+"</td>" +
                "        <td class='gms-song'>"+game_data["song"]+"</td>" +
                "        <td class='gms-loc' style='display: inline-flex'>"+ game_data["location"] +"</td>"+
                "        <td class='gms-winner'>"+game_data["winner"]+"</td>"+
                "        <td class='gms-place' style='background-color:" + place_color + "'>"+my_place.toString()+"</td></tr>";
            games_table.innerHTML = games_table.innerHTML + row_html;
        }
    });
}

function populateReportPeopleList() {
    socket.emit('request-people-list');
    socket.on('return-people-list', function(data) {
        socket.off('return-people-list');
        let players_list = document.getElementById('people-list');
        players_list.innerHTML = "";
        for(let d in data) {
            let player = data[d];
            players_list.innerHTML = players_list.innerHTML + "<option>"+player["nickname"]+" ("+player["name"]+")"+"</option>";
        }
    });
    socket.emit('request-songs-list');
    socket.on('return-songs-list', function(data) {
        socket.off('return-songs-list');
        let songs_list = document.getElementById('songs-list');
        songs_list.innerHTML = "";
        for(let d in data) {
            let song = data[d];
            songs_list.innerHTML = songs_list.innerHTML + "<option>"+song["song"]+"</option>";
        }
    });
    socket.on('return-locations-list', function(data) {
        socket.off('return-locations-list');
        let locations_list = document.getElementById('locations-list');
        locations_list.innerHTML = "";
        for(let d in data) {
            let location = data[d];
            locations_list.innerHTML = locations_list.innerHTML + "<option>"+location["location"]+"</option>";
        }
    })
}

function openGamePage(id) {
    $("#main-body").load("game");
    sessionStorage.setItem("opened_game_id", id)
}

function setupGamePage() {
    let id = sessionStorage.getItem("opened_game_id");
    sessionStorage.removeItem('opened_game_id');
    socket.emit('request-game', id);
    socket.on('return-game', function(data, players) {
        socket.off('return-game');
        let game_data = data[0];
        if(game_data["song"] === "" || game_data["song"] === '') {
            document.getElementById('game-song').innerText = "[Song Not Reported]"
        } else {
            document.getElementById('game-song').innerText = game_data["song"];
        }
        if(game_data["location"] === null || game_data["location"] === '') {
            document.getElementById('game-location').innerText = "[Location Not Reported]"
        } else {
            document.getElementById('game-location').innerText = game_data["location"];
        }
        let time = ((parseInt(game_data["date"].substr(11,2))-4)%12).toString() + game_data["date"].substr(13,3);
        if((parseInt(game_data["date"].substr(11,2))-4) < 12) {
            time = time + " AM";
        } else {
            time = time + " PM";
        }
        let date = game_data["date"].substr(5, 2) + "/" + game_data["date"].substr(8, 2) + "/" + game_data["date"].substr(2, 2);
        document.getElementById('game-datetime').innerText = time + " " + date;
        setupGameLeaderboard(players);
    });
}

function setupGameLeaderboard(data) {
    let leaders_table = document.getElementById("leaderboard-table");
    leaders_table.innerHTML = "<tr id=\"leaderboard-table-header\" class=\"leaderboard-row\">"+
        "<td class=\"ldb-rank\">Place</td>\n" +
        "        <td class=\"ldb-player\">Player</td>\n" +
        "        <td class=\"ldb-rating\">Current Rating</td>"+
        "</tr>";
    const sp = "&nbsp;&nbsp;&nbsp;";
    for(let i in data) {
        if(data[i] !== null) {
            let player_data = data[i][0];
            let rank = parseInt(i) + 1;
            let row_html = "<tr class='leaderboard-row' onclick='openPlayerProfile(" + player_data["id"] + ");'>" +
                "        <td class='ldb-rank'>" + rank.toString() + "</td>" +
                "        <td class='ldb-player' style='display: inline-flex'>" +
                "           <div class='ldb-player-nick'>" + player_data["nickname"] + "</div>" +
                "           <div class='ldb-player-full'>" + sp + player_data["name"] + "</div>" +
                "           <div class='ldb-player-tags' id='player-tags-" + player_data["id"] + "'>" + sp + "</div></td>" +
                "        <td class='ldb-rating'>" + player_data["rating"] + "</td></tr>";
            leaders_table.innerHTML = leaders_table.innerHTML + row_html;

            let tags_container = document.getElementById("player-tags-" + player_data["id"]);
            let tags_raw = player_data["tags"];
            if(tags_raw !== null) {
                let tags = tags_raw.split(';');
                for (let t in tags) {
                    let tag = tags[t];
                    tags_container.innerHTML = tags_container.innerHTML + "&nbsp;" +
                        "<div class='ldb-player-tag " + tag + "'>" + tag + "</div>";
                }
            }
        }
    }
}
