import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import {
  Button,
  CssBaseline,
  Divider,
  Link,
  Theme,
  ThemeProvider,
  Typography,
  createMuiTheme,
  makeStyles,
} from '@material-ui/core';
import {
  ActionRequest,
  AudioActionResponse,
  ChatController,
  FileActionResponse,
  MuiChat,
} from 'chat-ui-react';

const today = new Date();

const initialFormState = { image: '', companyname: '' , name: ''}

const muiTheme = createMuiTheme({
  palette: {
    primary: {
      main: '#007aff',
    },
  },
});
const useStyles = makeStyles((theme) => ({
  root: {
    height: '100%',
    minHeight: '100vh',
    backgroundColor: 'gray',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxWidth: '640px',
    marginLeft: 'auto',
    marginRight: 'auto',
    backgroundColor: theme.palette.background.default,
  },
  header: {
    padding: theme.spacing(1),
  },
  chat: {
    flex: '1 1 0%',
  },
}));

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
  }))
  setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.companyname || !formData.name) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }
  
  async function onChange(e) {
  if (!e.target.files[0]) return
  const file = e.target.files[0];
  setFormData({ ...formData, image: file.name });
  await Storage.put(file.name, file);
  fetchNotes();
}

  // return (
  //   <div className="App">
  //     <h1>My Notes App</h1>
  //     <input
  //       onChange={e => setFormData({ ...formData, 'name': e.target.value})}
  //       placeholder="Note name"
  //       value={formData.name}
  //     />
  //     <input
  //       onChange={e => setFormData({ ...formData, 'description': e.target.value})}
  //       placeholder="Note description"
  //       value={formData.description}
  //     />
  //     <input type="file" onChange={onChange} />
  //     <button onClick={createNote}>Create Note</button>
  //     <div style={{marginBottom: 30}}>
  //       {
  //         notes.map(note => (
  //           <div key={note.id || note.name}>
  //             <h2>{note.name}</h2>
  //             <p>{note.description}</p>
  //             <button onClick={() => deleteNote(note)}>Delete note</button>
  //             {
  //               note.image && <img src={note.image} style={{width: 400}} />
  //             }
  //           </div>
  //         ))
  //       }
  //     </div>
  //     <AmplifySignOut />
  //   </div>
  // );
  
  const classes = useStyles();
  const [chatCtl] = React.useState(new ChatController());
  React.useMemo(() => {
    echo(chatCtl);
  }, [chatCtl]); 
  
  return(
    <div className="App">
      <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className={classes.root}>
        <div className={classes.container}>
          <div className={classes.chat}>
            <MuiChat chatController={chatCtl} />
            
          </div>
        </div>
      </div>
      </ThemeProvider>
    </div>
    )
}

export default withAuthenticator(App);

async function echo(chatCtl) {
    await chatCtl.addMessage({
      type: 'text',
      content: `画像を入力してください`,
      self: false,
    });
    const file = (await chatCtl.setActionRequest({
      type: 'file',
      accept: 'image/*',
      multiple: true,
    })) 
    await chatCtl.addMessage({
      type: 'text',
      content: (
        <div>
          {file.files.map((f) => (
            <img
              key={file.files.indexOf(f)}
              src={window.URL.createObjectURL(f)}
              alt="File"
              style={{ width: '100%', height: 'auto' }}
            />
          ))}
        </div>
      ),
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: '郵便物の宛先部署を入力してください',
      self: false,
    });
    const sel = await chatCtl.setActionRequest({
      type: 'select',
      options: [
        {
          value: 'DXD',
          text: 'DX推進部',
        },
        {
          value: 'BASICD',
          text: '基盤技術部',
        },
        {
          value: 'ICTAD',
          text: 'ICT総括部',
        },
        {
          value: 'ICTO',
          text:'ICT推進室',
        },
      ],
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `宛先部署:\n${sel.value}`,
      self: false,
    });
    
    await chatCtl.addMessage({
      type: 'text',
      content: '郵便物の宛先氏名を入力して下さい',
      self: false,
    });
    const adress = await chatCtl.setActionRequest({
      type: 'text',
      placeholder: '郵便物の宛先氏名を入力して下さい',
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `郵便物の宛先氏名:\n${adress.value}`,
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: '差出人会社名を入力してください',
      self: false,
    });
    const company = await chatCtl.setActionRequest({
      type: 'text',
      placeholder: '差出人会社名を入力してください',
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `差出人会社名:\n${company.value}`,
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: '差出人担当者を入力してください',
      self: false,
    });
    const companyname = await chatCtl.setActionRequest({
      type: 'text',
      placeholder: '差出人担当者を入力してください',
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `差出人担当者:\n${companyname.value}`,
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: '受領日は本日日付でよろしいですか？',
      self: false,
    });
    const day = await chatCtl.setActionRequest({
      type: 'select',
      options: [
        {
          value: 'YES',
          text: 'はい',
        },
        {
          value: 'NO',
          text: 'いいえ',
        },
      ],
    });
    var receivedDate;
    if(day.value=="はい"){
      receivedDate=`${today.getYear()+1900}年${today.getMonth()+1}月${today.getDate()}日`;
      await chatCtl.addMessage({
        type: 'text',
        content: `受領日:${receivedDate}`,
        self: false,
      });
    }else{
      await chatCtl.addMessage({
      type: 'text',
      content: '受領日はいつにしますか？',
      self: false,
    });
      const noday = await chatCtl.setActionRequest({
        type: 'text',
        placeholder: '受領日はいつにしますか？(○年○月○日)',
      });
      receivedDate=noday.value;
      await chatCtl.addMessage({
        type: 'text',
        content: `受領日:\n${receivedDate}`,
        self: false,
      });
    }
    await chatCtl.addMessage({
      type: 'text',
      content: '郵便種別を入力してください',
      self: false,
    });
    const type = await chatCtl.setActionRequest({
      type: 'select',
      options: [
        {
          value: 'NORMAL',
          text: '普通',
        },
        {
          value: 'FAST',
          text: '速達',
        },
        {
          value: 'OTHER',
          text: 'その他',
        },
      ],
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `郵便種別:\n${type.value}`,
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: '保管先を入力してください',
      self: false,
    });
    const place = await chatCtl.setActionRequest({
      type: 'select',
      options: [
        {
          value: 'bag',
          text: '庶務席横の紙袋',
        },
        {
          value: 'MYSELF',
          text: '登録者預かり',
        },
        {
          value: 'THEOTHER',
          text: 'その他',
        },
      ],
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `保管先:\n${place.value}`,
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: 'その他を入力してください',
      self: false,
    });
    const other = await chatCtl.setActionRequest({
      type: 'text',
      placeholder: 'その他お伝えしたいことを記入してください',
    });
    await chatCtl.addMessage({
      type: 'text',
      content: `その他:\n${other.value}`,
      self: false,
    });
    await chatCtl.addMessage({
      type: 'text',
      content: '以下の内容で登録してよろしいですか？',
      self: false,
    });
    await chatCtl.addMessage({
        type: 'text',
        content: `宛先部署:${sel.value}\n宛先指名:${adress.value}\n差出人会社名:${company.value}\n差出人担当者:${companyname.value}\n受託日:${receivedDate}\n郵便種別:${type.value}\n保管先:${place.value}\nその他:${other.value}`,
        self: false,
      });
    const last = await chatCtl.setActionRequest({
      type: 'select',
      options: [
        {
          value: 'OK',
          text: 'はい',
        },
        {
          value: 'NO',
          text: 'いいえ',
        },
      ],
    });
    if(last.value=="はい"){
      // createNote(sel.value,adress.value);
      await chatCtl.addMessage({
        type: 'text',
        content: '上記の内容で登録しました',
        self: false,
      });
    }else{
      await chatCtl.addMessage({
        type: 'text',
        content: '最初からやり直してください',
        self: false,
      });
    }
}

