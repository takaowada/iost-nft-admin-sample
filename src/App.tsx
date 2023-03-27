import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { iosUtil } from './iosUtil';
import './App.css';

interface Token {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
}

const columns: GridColDef[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 100,
  },
  {
    field: 'name',
    headerName: '名前',
    width: 200,
  },
  {
    field: 'category',
    headerName: 'カテゴリー',
    width: 100,
  },
  {
    field: 'imageUrl',
    headerName: '画像URL',
    width: 200,
  },
];

function App() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [response, setResponse] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [tokenId, setTokenId] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Token>({
    defaultValues: {
      id: 1,
      name: '',
      category: 'ART',
      imageUrl: '',
    },
  });

  useEffect(() => {
    const f = async () => {
      try {
        await iosUtil.init();
        const tokens = await iosUtil.getTokens(iosUtil.getAccount().getID());
        setTokens(tokens);
        console.log('tokens', tokens);
      } catch (e) {
        console.log(e);
        setErr('iWalletを開いて、ログイン後、リロードしてください');
      }
    };
    f();
  }, []);

  const validationRules = {
    id: {
      required: 'IDを入力してください。',
      min: { value: 0, message: '0以上で入力してください。' },
      max: { value: 19999999, message: '9999999以下で入力してください。' },
    },
    name: {
      required: '名前を入力してください。',
      minLength: { value: 2, message: '2文字以上で入力してください。' },
    },
    category: {
      required: 'カテゴリーを入力してください。',
      minLength: { value: 2, message: '2文字以上で入力してください。' },
    },
    imageUrl: {
      required: '画像URLを入力してください。',
    },
    account: {
      required: '発行先アカウントを入力してください。',
    },
  };

  const onSubmit: SubmitHandler<Token> = async (data: Token) => {
    console.log('data', data);
    const handler = await iosUtil.createToken(
      Number(data.id),
      data.name,
      data.category,
      data.imageUrl
    );
    handler
      .on('pending', () => {
        console.log('Start tx.');
      })
      .on('success', async (response: any) => {
        console.log('Success... tx', response);
        setResponse(JSON.stringify(response));
        console.log('response', JSON.stringify(response));
        const tokens = await iosUtil.getTokens(iosUtil.getAccount().getID());
        setTokens(tokens);
      })
      .on('failed', (err: any) => {
        console.log('failed: ', err);
        setResponse(JSON.stringify(err));
        console.log('response', JSON.stringify(err));
      });
  };

  const onIssue = async (event: any) => {
    event.preventDefault();
    console.log('event', event);
    const handler = await iosUtil.issueToken(
      Number(tokenId),
      toAccount
    );
    handler
      .on('pending', () => {
        console.log('Start tx.');
      })
      .on('success', async (response: any) => {
        console.log('Success... tx', response);
        setResponse(JSON.stringify(response));
        console.log('response', JSON.stringify(response));
        const tokens = await iosUtil.getTokens(iosUtil.getAccount().getID());
        setTokens(tokens);
      })
      .on('failed', (err: any) => {
        console.log('failed: ', err);
        setResponse(JSON.stringify(err));
        console.log('response', JSON.stringify(err));
      });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          NFTの作成
        </Typography>
        {err && <Alert severity="error">{err}</Alert>}
        <Stack
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          spacing={2}
          sx={{ m: 2, width: '25ch' }}
        >
          <Controller
            name="id"
            control={control}
            rules={validationRules.id}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                id="outlined-number"
                label="トークンID"
                error={errors.id !== undefined}
                helperText={errors.id?.message}
              />
            )}
          />
          <Controller
            name="name"
            control={control}
            rules={validationRules.name}
            render={({ field }) => (
              <TextField
                {...field}
                type="text"
                label="名前"
                error={errors.name !== undefined}
                helperText={errors.name?.message}
              />
            )}
          />
          <Controller
            name="category"
            control={control}
            rules={validationRules.category}
            render={({ field }) => (
              <TextField
                {...field}
                type="text"
                label="カテゴリー"
                error={errors.category !== undefined}
                helperText={errors.category?.message}
              />
            )}
          />
          <Controller
            name="imageUrl"
            control={control}
            rules={validationRules.imageUrl}
            render={({ field }) => (
              <TextField
                {...field}
                type="text"
                label="画像URL"
                error={errors.imageUrl !== undefined}
                helperText={errors.imageUrl?.message}
              />
            )}
          />
          <Button variant="contained" type="submit">
            追加
          </Button>
        </Stack>
      </Box>
      <Divider variant="middle" />
      <Box
        sx={{
          '& .MuiTextField-root': { m: 1, width: '100%' },
        }}
      >
        <TextField
          id="response"
          multiline
          defaultValue={response}
          InputProps={{
            readOnly: true,
          }}
          variant="outlined"
        />
      </Box>
      <br />
      <Box sx={{ height: 400, width: '100%' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          作成済みNFT一覧
        </Typography>
        <DataGrid
          rows={tokens}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          experimentalFeatures={{ newEditingApi: true }}
        />
      </Box>
      <br/>
      <Box sx={{ my: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          NFTの発行
        </Typography>
        {err && <Alert severity="error">{err}</Alert>}
        <Stack
          component="form"
          noValidate
          onSubmit={onIssue}
          spacing={2}
          sx={{ m: 2, width: '25ch' }}
        >
          <TextField
            name="id"
            type="number"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
            label="トークンID"
            value={tokenId}
            onChange={(event) => setTokenId(event.target.value)}
          />
          <TextField
            name="toAccount"
            type="text"
            label="発行先アカウント"
            value={toAccount}
            onChange={(event) => setToAccount(event.target.value)}
          />
          <Button variant="contained" type="submit">
            発行
          </Button>
        </Stack>
      </Box>
    </Container>
  );
}

export default App;
