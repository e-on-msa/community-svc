"use strict";

const amqp = require("amqplib");
const { Post, Comment, Board, BoardRequest, sequelize } = require("../models");

const RABBITMQ_URL = process.env.RABBITMQ_URL;

// 이벤트 핸들러
const handlers = {
  // 게시글/댓글 HIDDEN 처리 (탈퇴/정지)
  "user.deactivated": async (payload) => {
    // 탈퇴 시 게시글/댓글을 HIDDEN 처리
    const { userId } = payload;
    await Post.update({ status: "HIDDEN" }, { where: { user_id: userId } });
    await Comment.update({ status: "HIDDEN" }, { where: { user_id: userId } });

    console.log(`[RabbitMQ] user.deactivated 처리 완료 userId=${userId}`);
  },

  "user.suspended": async (payload) => {
    // 정지 시 게시글/댓글을 HIDDEN 처리
    const { userId } = payload;
    await Post.update({ status: "HIDDEN" }, { where: { user_id: userId } });
    await Comment.update({ status: "HIDDEN" }, { where: { user_id: userId } });

    console.log(`[RabbitMQ] user.suspended 처리 완료 userId=${userId}`);
  },

  // 게시글/댓글 ACTIVE 복원 (정지 해제)
  "user.unsuspended": async (payload) => {
    // 정지 해제 시 게시글/댓글을 ACTIVE로 복원
    const { userId } = payload;
    await Post.update({ status: "ACTIVE" }, { where: { user_id: userId } });
    await Comment.update({ status: "ACTIVE" }, { where: { user_id: userId } });

    console.log(`[RabbitMQ] user.unsuspended 처리 완료 userId=${userId}`);
  },

  // 게시판 개설 승인
  "admin.board.approved": async (payload) => {
    const { requestId } = payload;
    await sequelize.transaction(async (t) => {
      const boardRequest = await BoardRequest.findByPk(requestId, {
        transaction: t,
      });
      if (!boardRequest || boardRequest.request_status !== "pending") return;

      const newBoard = await Board.create(
        {
          board_name: boardRequest.requested_board_name,
          board_type: boardRequest.requested_board_type,
          board_audience: boardRequest.board_audience,
        },
        { transaction: t },
      );

      await boardRequest.update(
        { request_status: "approved", board_id: newBoard.board_id },
        { transaction: t },
      );
    });

    console.log(
      `[RabbitMQ] admin.board.approved 처리 완료 requestId=${requestId}`,
    );
  },

  // 게시판 개설 거절
  "admin.board.rejected": async (payload) => {
    const { requestId } = payload;
    const boardRequest = await BoardRequest.findByPk(requestId);
    if (!boardRequest || boardRequest.request_status !== "pending") return;
    await boardRequest.update({ request_status: "rejected" });

    console.log(
      `[RabbitMQ] admin.board.rejected 처리 완료 requestId=${requestId}`,
    );
  },
};

// RabbitMQ 연결 및 구독
exports.connect = async () => {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();

    for (const [eventName, handler] of Object.entries(handlers)) {
      const queueName = `community.${eventName}`;
      await channel.assertQueue(queueName, { durable: true });
      channel.consume(queueName, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload);
          channel.ack(msg);
        } catch (err) {
          console.error(`[RabbitMQ] ${eventName} 처리 실패:`, err);
          channel.nack(msg, false, false); // dead-letter로 보냄
        }
      });

      console.log(`[RabbitMQ] 구독 시작: ${queueName}`);
    }

    conn.on("error", (err) => console.error("[RabbitMQ] 연결 오류:", err));
    conn.on("close", () => console.warn("[RabbitMQ] 연결 종료"));
  } catch (err) {
    console.error("[RabbitMQ] 연결 실패 (이벤트 수신 비활성화):", err.message);
  }
};
