FROM node:18

# Install Python, pip, and ffmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg

# Install yt-dlp using pip
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD [ "npm", "start" ]