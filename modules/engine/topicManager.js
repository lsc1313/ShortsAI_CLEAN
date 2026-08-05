import fs from "fs";
import path from "path";

const DB_DIR = "database";
const DB_FILE = path.join(DB_DIR, "topics.json");

function ensureDB(){

    if(!fs.existsSync(DB_DIR)){

        fs.mkdirSync(DB_DIR,{recursive:true});

    }

    if(!fs.existsSync(DB_FILE)){

        fs.writeFileSync(

            DB_FILE,

            JSON.stringify({},null,2),

            "utf8"

        );

    }

}

function loadDB(){

    ensureDB();

    return JSON.parse(

        fs.readFileSync(DB_FILE,"utf8")

    );

}

function saveDB(db){

    fs.writeFileSync(

        DB_FILE,

        JSON.stringify(db,null,2),

        "utf8"

    );

}

export async function getTopicPlan(topic){

    const db = loadDB();

    if(!db[topic]){

        db[topic]={

            used:[],

            banned:[]

        };

        saveDB(db);

    }

return{

    topic,

    used:[

        ...db[topic].used

    ],

    banned:[

        ...db[topic].banned

    ],

    excluded:[

        ...new Set([

            ...db[topic].used,

            ...db[topic].banned

        ])

    ]

};

}

export async function saveSubject(

    topic,

    subject

){

    const db=loadDB();

    if(!db[topic]){

        db[topic]={

            used:[],

            banned:[]

        };

    }

    if(

        !db[topic].used.includes(subject)

    ){

        db[topic].used.push(subject);

    }

    saveDB(db);

}

export async function banSubject(

    topic,

    subject

){

    const db=loadDB();

    if(!db[topic]){

        db[topic]={

            used:[],

            banned:[]

        };

    }

    if(

        !db[topic].banned.includes(subject)

    ){

        db[topic].banned.push(subject);

    }

    saveDB(db);

}

export async function resetTopic(topic){

    const db=loadDB();

    delete db[topic];

    saveDB(db);

}

export async function getHistory(topic){

    const db=loadDB();

    if(!db[topic]){

        return [];

    }

    return db[topic].used;

}
