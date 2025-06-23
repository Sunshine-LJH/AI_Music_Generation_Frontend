import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import axios from '../axiosConfig';
import Cookies from 'js-cookie';

const PROMPT_WORDS = ['minor chords', 'hip hop', 'light music', 'movie soundtrack', '80s synthwave', 'acoustic folk'];

const UploadProgress = ({ fileName, onCancel }) => (
  <View style={styles.uploadProgressContainer}>
    <View style={styles.uploadProgressArt}>
      <Ionicons name="musical-note" size={24} color="#fff" />
    </View>
    <View style={styles.uploadProgressInfo}>
      <Text style={styles.uploadProgressFileName} numberOfLines={1}>{fileName}</Text>
      <Text style={styles.uploadProgressStatus}>Ready to create</Text>
    </View>
    <TouchableOpacity style={styles.uploadCancelButton} onPress={onCancel}>
      <Text style={styles.uploadCancelButtonText}>Remove</Text>
    </TouchableOpacity>
  </View>
);

const MainScreen = () => {
  const [songDescription, setSongDescription] = useState('');
  const [songList, setSongList] = useState([]);
  const [sound, setSound] = useState(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [stagedSong, setStagedSong] = useState(null);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  const handleAddTag = (tag) => {
    setSongDescription(prev => `${prev} ${tag}`.trim());
  };

  const removeStagedSong = () => {
    setStagedSong(null);
  }

  const handleUploadAudio = async () => {
    if (stagedSong) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // asset 在Web上就是一个 File 对象，它包含了 name, size, type 等所有信息。
        setStagedSong(asset);
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const handleCreate = async () => {
    if (songDescription.trim() === '' && !stagedSong) {
      return; // 按钮禁用时，此函数不被调用
    }
    // 使用 FormData 来打包数据，这对于文件上传是必须的
    const formData = new FormData();

    // 添加csrfToken
    const csrfToken = Cookies.get('csrftoken');
    if (csrfToken) {
      formData.append('csrfmiddlewaretoken', csrfToken);
    } else {
      // 应该有 token，如果没有，给用户一个提示
      alert('A security error occurred. Please refresh the page and try again.');
      return;
    }

    // 添加文本数据
    if (songDescription.trim() !== '') {
      formData.append('description', songDescription);
    }
    // 添加音频文件数据
    if (stagedSong) {
      // stagedSong.file 是一个 File 对象
      formData.append('audio_file', stagedSong.file);
    }
    try {
      const response = await axios.post('/api/create/', formData);

      const newSongFromBackend = response.data;

      // 将后端返回的歌曲添加到列表中
      if (newSongFromBackend && newSongFromBackend.id) {
        setSongList(prevList => [newSongFromBackend, ...prevList]);
      }
      // 操作成功后，清空输入
      setStagedSong(null);
      setSongDescription('');
    } catch (error) {
      alert('Failed to create song. Please check the console for details.');
    }
  };

  const handleDeleteSong = async (songToDelete) => {
    if (currentlyPlaying === songToDelete.uri) {
      if (sound) {
        await sound.stopAsync();
      }
      setSound(null);
      setCurrentlyPlaying(null);
    }

    if (songToDelete.uri) {
      try {
        await FileSystem.deleteAsync(songToDelete.uri);
        console.log('Successfully deleted cached file:', songToDelete.uri);
      } catch (error) {
        console.error('Error deleting cached file:', error);
      }
    }

    setSongList(prevList => prevList.filter(song => song.id !== songToDelete.id));
  };

  const handlePlayPauseSong = async (song) => {
    if (!song.uri) return;

    if (sound) {
      await sound.stopAsync();
      if (currentlyPlaying === song.uri) {
        setCurrentlyPlaying(null);
        setSound(null);
        return;
      }
    }

    setCurrentlyPlaying(song.uri);
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.uri },
        { shouldPlay: true }
      );
      setSound(newSound);
    } catch (error) {
      console.error("Error playing sound: ", error);
      setCurrentlyPlaying(null);
    }
  };

  const renderSongItem = ({ item }) => {
    const isPlaying = currentlyPlaying === item.uri;

    return (
      <View style={styles.songItemOuterContainer}>
        <TouchableOpacity
          style={styles.songItemContainer}
          onPress={() => handlePlayPauseSong(item)}
        >
          <View style={styles.songArt}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
          </View>
          <Text style={styles.songName} numberOfLines={2}>{item.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteSong(item)}>
          <Ionicons name="trash-outline" size={22} color="#AEAEAE" />
        </TouchableOpacity>
      </View>
    );
  };

  // Create button is enabled if text exists OR a song is staged.
  const isCreateButtonDisabled = songDescription.trim() === '' && !stagedSong;

  return (
    <View style={styles.container}>
      {/* Left Panel */}
      <View style={styles.leftPanel}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.leftPanelContent}>
            <View style={styles.describeBox}>
              <Text style={styles.describeTitle}>Describe Your Music</Text>
              <TextInput
                style={styles.textInput}
                value={songDescription}
                onChangeText={setSongDescription}
                multiline
                placeholder="You can use the following prompt words to describe your music..."
                placeholderTextColor="#8A8A8A"
              />
              <View style={styles.describeActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleUploadAudio} disabled={!!stagedSong}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Audio</Text>
                </TouchableOpacity>
              </View>
            </View>

            {stagedSong && (
              <UploadProgress
                fileName={stagedSong.name}
                onCancel={removeStagedSong}
              />
            )}

            <View style={styles.inspirationBox}>
              <Text style={styles.describeTitle}>Prompt Words</Text>
              <View style={styles.tagsContainer}>
                {PROMPT_WORDS.map(tag => (
                  <TouchableOpacity key={tag} style={styles.tag} onPress={() => handleAddTag(tag)}>
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.createButtonWrapper}
          onPress={handleCreate}
          disabled={isCreateButtonDisabled}
        >
          <LinearGradient
            colors={isCreateButtonDisabled ? ['#555', '#444'] : ['#ffb347', '#ff4f81', '#a73779']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.createButton}
          >
            <Ionicons name="musical-notes" size={20} color="#FFF" />
            <Text style={styles.createButtonText}>Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Right Panel */}
      <View style={styles.rightPanel}>
        <Text style={styles.rightPanelTitle}>My Music List ({songList.length})</Text>
        {songList.length > 0 ? (
          <FlatList
            data={songList}
            renderItem={renderSongItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingTop: 20 }}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Your created music will appear here.</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, flexDirection: 'row', backgroundColor: '#121212', color: '#fff',
  },
  leftPanel: {
    width: 450, backgroundColor: '#1C1C1E', borderRightWidth: 1, borderRightColor: '#333', flexShrink: 0,
  },
  leftPanelContent: {
    padding: 25,
  },
  describeBox: {
    backgroundColor: '#2C2C2E', borderRadius: 12, padding: 15, marginBottom: 20,
  },
  describeTitle: {
    color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 10,
  },
  textInput: {
    color: '#fff', fontSize: 16, minHeight: 80, textAlignVertical: 'top', padding: 5, lineHeight: 22,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  describeActions: {
    flexDirection: 'row', marginTop: 15, borderTopWidth: 1, borderTopColor: '#444', paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#444', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 10,
  },
  actionButtonText: {
    color: '#fff', marginLeft: 5, fontWeight: '500',
  },
  inspirationBox: {
    marginTop: 10,
  },
  tagsContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#444', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8,
  },
  tagText: {
    color: '#fff', marginLeft: 4,
  },
  createButtonWrapper: {
    padding: 20, paddingTop: 10, backgroundColor: '#1C1C1E', borderTopWidth: 1, borderTopColor: '#333'
  },
  createButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginLeft: 10,
  },
  uploadProgressContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 12, padding: 12, marginBottom: 20,
  },
  uploadProgressArt: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  uploadProgressInfo: {
    flex: 1,
  },
  uploadProgressFileName: {
    color: '#fff', fontWeight: '600', fontSize: 15,
  },
  uploadProgressStatus: {
    color: '#90EE90', fontSize: 12,
  },
  uploadCancelButton: {
    backgroundColor: '#444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginLeft: 12,
  },
  uploadCancelButtonText: {
    color: '#fff', fontWeight: '500',
  },
  rightPanel: {
    flex: 1, padding: 30,
  },
  rightPanelTitle: {
    color: '#fff', fontSize: 28, fontWeight: 'bold',
  },
  songItemOuterContainer: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#2C2C2E', borderRadius: 10,
  },
  songItemContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 12, flex: 1,
  },
  songArt: {
    width: 50, height: 50, borderRadius: 8, backgroundColor: 'rgba(255, 129, 151, 0.5)',
    justifyContent: 'center', alignItems: 'center', marginRight: 15, flexShrink: 0,
  },
  songName: {
    color: '#fff', fontSize: 16, flex: 1,
  },
  deleteButton: {
    padding: 15,
  },
  emptyStateContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff', fontSize: 18, marginBottom: 10,
  },
  emptyStateSubText: {
    color: '#AEAEAE', fontSize: 14,
  },
});

export default MainScreen;

