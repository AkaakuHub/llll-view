# llll-view

An asset viewer for the LLLL game. **Research purpose only.**

> I cannot take responsibility. Please be responsible for yourself.
> Do not host publicly as a service.

This project is still in development. Contributions are very welcome.
Linux is supported.

# Features

## Audio - ◎
- [x] convert from acb to m4a
- [x] playable with proper metadata
- [x] get new songs when released

## Card - ◎
- [x] show illustration
- [x] show card effect movie
- [x] play card voice
- [x] show card status
- [ ] translation support
  - ongoing, partly supported

## Story - ○
- [x] show storyline
- [x] play voice
- [x] search any word from storyline
- [x] translation support
- [ ] show 3d model
- [ ] move camera

## Card game - ×
- [ ] show card game assets
- [ ] playable card game simulator

## Rhythm game - ×
- [ ] show rhythm game assets
- [ ] playable rhythm game simulator

## With×Meets - ×
- [ ] show with×meets assets
- [ ] playable with×meets simulator
- [ ] translation support

## Fes×Live - ×
- [ ] show fes×live assets
- [ ] playable fes×live simulator

# Setup

If you are new to web development, please follow the steps below.

Your final directory layout should look like this:

```
llll/
  llll-tools/
    bin/
      ffmpeg
    vgmstream/
      build/
        cli/
          vgmstream-cli
    AssetStudio/
      AssetStudioCLI/
        bin/
          Release/
            net8.0/
              AssetStudioModCLI
    UsmToolkit/
      UsmToolkit
  llll-view/
    ...
  inspix-hailstorm/
    ...
```

After cloning, check `backend/.env` to understand required tool names and paths.

## Install Node.js and pnpm

I recommend using [proto](https://moonrepo.dev/docs/proto/install) to manage Node.js and pnpm versions.

```bash
# Ubuntu / Debian
apt-get install git unzip gzip xz-utils
```

And then, install proto:

```bash
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)
```

## Setup project dependencies

This project requires many dependencies. First, decide the root project directory (for example, `~/llll`) and clone this repository into it:

```bash
git clone (this repository url)
```

### Install llll-view dependencies

Install node dependencies using pnpm:

```bash
cd llll-view
pnpm install
```

### Install llll-tools

The tools below are required to process LLLL assets. Place them under `llll/llll-tools`.

- [ffmpeg](https://www.ffmpeg.org/download.html#build-linux) (to convert various audio formats)
- [vgmstream](https://github.com/vgmstream/vgmstream) (to convert from original acb format to wav)
- [AssetStudioCLI](https://github.com/aelurum/AssetStudio) (this version is modified to support recent Unity versions)
- [UsmToolkit](https://github.com/Rikux3/UsmToolkit) (to extract card effect movies)

Some tools depend on:
- .NET 3.1 (required by UsmToolkit)
- .NET 8.0 (required by AssetStudioCLI)

Please be careful about versions of .NET.

You can get these tools as open source projects.

However, due to licensing issues, official prebuilt binaries do not include the good m4a library.
If you want high-quality m4a output, build ffmpeg yourself and place it at `llll-tools/bin/ffmpeg`.
If you do not mind m4a quality, use an official static build instead.

### WebP support
Some thumbnail images are converted to WebP format, so `cwebp` command is required:

```bash
# Ubuntu/Debian
sudo apt-get install webp
```

## Frontend setup
Copy `frontend/.env.example` to `frontend/.env` and adjust variables if necessary.
`CORS_ORIGIN` refers to backend server origin. This is required to allow browser to access backend server.

## Backend setup
Copy `backend/.env.example` to `backend/.env` and adjust variables if necessary.

## Asset server setup

Thanks to [inspix-hailstorm](https://github.com/vertesan/inspix-hailstorm), you can handle assets like official client.
Clone the repository under `llll/` directory:

```bash
cd llll
git clone https://github.com/vertesan/inspix-hailstorm
```

## Final check

If you are not sure whether setup is correct, check `backend/.env` for required tool names and paths, then adjust them to your environment.

## Browser requirements

Google Chrome on PC is required for some features like transcription and translation.
Official requirements are here: https://developer.chrome.com/docs/ai/prompt-api

- Translation

Set `chrome://flags/#translation-api` to `Enable` and use an HTTPS connection to use the translation feature.

- Transcription

Set the following flags to `Enable`:
`chrome://flags/#optimization-guide-on-device-model`
`chrome://flags/#prompt-api-for-gemini-nano`
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`

I tested with an RTX 5070 Ti. Speed is pretty good, but quality is quite low. Whisper might be better, but it adds heavy dependencies on the server or client side.

# FAQ
Please check help page in the app first.

If you run into issues during setup, use an AI chat to troubleshoot.

I do not have any rights to LLLL assets.
