const sendNotification = async (userId, message) => {
  return {
    user_id: userId,
    message,
    sent_at: new Date().toISOString()
  };
};

module.exports = {
  sendNotification
};
