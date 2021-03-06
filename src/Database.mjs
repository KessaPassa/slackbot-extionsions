import * as Messages from './Messages';
import firebase from 'firebase';

let database = null;

const DUMMY = 'Dummy';
const MEMO = 'channels';
const ROOM = 'room';


// データベース初期化
export function setup() {
    let config = {
        apiKey: process.env.apiKey,
        authDomain: process.env.authDomain,
        databaseURL: process.env.databaseURL,
        storageBucket: process.env.storageBucket
    };
    firebase.initializeApp(config);
    database = firebase.database();
}


// データベースから読み込み
export function getChannels(id, callback) {
    database.ref(`${MEMO}/${id}`).once('value').then(function (snapshot) {
        if (snapshot.val() != null) {
            callback(snapshot.val().text);
        } else {
            callback(null);
        }
    });
}


export function add(id, name, text, callback) {
    //データが存在してるか読み取り
    getChannels(id, function (text_array) {
        let result = '';

        //最初の時だけ
        if (!text_array) {
            database.ref(`${MEMO}/${id}`).set({
                name: name,
                text: {
                    0: Messages.list_header(),
                    1: text
                }
            });
            result = 'initialize';
        }
        //追加
        else {
            let json = {};
            let i = 0;
            for (; i < text_array.length; i++) {
                json[i] = text_array[i];
            }
            json[i] = text;

            //データベースにセット
            database.ref(`${MEMO}/${id}`).set({
                name: name,
                text: json
            });
            result = 'complete';
        }

        callback(result);
    });
}

export function remove(id, name, num, callback) {
    console.log(num);

    //データが存在してるか読み取り
    getChannels(id, function (text_array) {
        let result = '';

        //何もないと削除できない
        if (!text_array) {
            result = null;
        }
        //0と、ない数値は消せない
        else if (num === 0 || text_array.length <= num) {
            result = -1;
        }
        //追加
        else {
            let remove_message = text_array[num];

            // データベースから削除
            text_array.splice(num, 1);
            // console.log(text_array);

            let json = {};
            for (let i = 0; i < text_array.length; i++) {
                json[i] = text_array[i];
            }

            //データベースにセット
            database.ref(`${MEMO}/${id}`).set({
                name: name,
                text: json
            });

            // 成功なら削除するメッセージ文を返す
            result = remove_message;
        }

        callback(result);
    });
}


// データベースから読み込み
export function getRoom(callback) {
    database.ref(ROOM).once('value').then(function (snapshot) {
        if (snapshot.val() != null) {
            let ids = [];
            let names = [];

            snapshot.forEach(function (result) {
                if (result.key !== DUMMY) {
                    ids.push(result.key);
                    names.push(result.child('name').val());
                }
            });

            callback(ids, names);
        } else {
            callback(null, null);
        }
    });
}

function deleteRoom(callback) {
    getRoom(function (ids, names) {
        ids.forEach(function (id) {
            // nullをセットすることで削除する
            database.ref(`${ROOM}/${id}`).set({
                id: null,
                name: null
            });
        });

        callback();
    });
}


export function login(id, name, callback) {

    getRoom(function (ids, names) {
        if (ids != null && names != null) {
            // console.log(ids);
            for (let i = 0; i < ids.length; i++) {
                // 既にログインしているなら
                if (ids[i] === id) {
                    callback(false);
                    return;
                }
            }
        }

        //データベースにセット
        database.ref(`${ROOM}/${id}`).set({
            name: name,
            text: 'login'
        });

        callback(true);
    });
}

export function logout(id, callback) {

    getRoom(function (ids, names) {
        if (ids != null && names != null) {
            // console.log(ids);
            for (let i = 0; i < ids.length; i++) {
                // ログインしているなら
                if (ids[i] === id) {
                    // nullをセットすることで削除する
                    database.ref(`${ROOM}/${id}`).set({
                        name: null,
                        text: null
                    });
                    callback(true);
                    return;
                }
            }
        }
        callback(false);
    });
}

export function updateStayingUsers(ids, names) {

    deleteRoom(function () {
        if (ids && names) {
            for (let i = 0; i < ids.length; i++) {
                let id = ids[i];
                let name = names[i];

                //データベースにセット
                database.ref(`${ROOM}/${id}`).set({
                    id: id,
                    name: name
                });
            }
        }
    });
}