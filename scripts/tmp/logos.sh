#!/bin/bash
# Temporal: baja logos de plataformas de Wikimedia Commons a assets/logos/plat/
mkdir -p assets/logos/plat
UA="Mozilla/5.0 (JoiLauncher; logos de plataformas)"
get() {
  id=$1; shift
  for n in "$@"; do
    curl -sSL -A "$UA" -o /tmp/l.svg "https://commons.wikimedia.org/wiki/Special:FilePath/$n" || continue
    if head -c 600 /tmp/l.svg | grep -qi "<svg" && [ $(stat -c %s /tmp/l.svg) -gt 300 ]; then
      cp /tmp/l.svg "assets/logos/plat/$id.svg"; echo "OK $id <- $n ($(stat -c %s /tmp/l.svg) B)"; return
    fi
    echo "  no: $id $n"
    sleep 1
  done
  echo "FALTA $id"
}
get netflix Netflix_2015_logo.svg
get prime Amazon_Prime_Video_logo.svg Prime_Video.svg "Amazon_Prime_Video_logo_(2024).svg"
get disney Disney+_logo.svg Disney_plus_logo.svg
get hbomax "Max_logo.svg" "HBO_Max_Logo.svg" "HBO_Max_2025_logo.svg" "HBO_Max_(2025).svg"
get appletv Apple_TV_Plus_Logo.svg "Apple_TV+_logo.svg" "Apple_TV_logo.svg" AppleTVLogo.svg
get movistar "Movistar_Plus+_logo.svg" "Movistar+_logo.svg" "Logo_Movistar_Plus+.svg" "Movistar_Plus_logo.svg" "Logo_de_Movistar_Plus+.svg"
get filmin Filmin_logo.svg Logo_Filmin.svg Filmin.svg
get skyshowtime SkyShowtime_logo.svg SkyShowtime.svg "Logo_SkyShowtime.svg"
get dazn DAZN_logo.svg DAZN.svg
get rtve "RTVE_Play_logo.svg" "Logo_RTVE_Play.svg" "Logo_RTVE.svg"
get atresplayer "Atresplayer_logo.svg" "Logotipo_de_atresplayer.svg" "Atresplayer.svg"
get plex "Plex_logo_2022.svg" "Plex_logo.svg"
ls -la assets/logos/plat
