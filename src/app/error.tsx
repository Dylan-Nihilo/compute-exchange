"use client";

import {Button, Card} from "@heroui/react";

type ErrorPageProps = {
  error: Error & {digest?: string};
  reset: () => void;
};

export default function ErrorPage({reset}: ErrorPageProps) {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <Card className="w-full max-w-md" role="alert">
        <Card.Header>
          <Card.Title>服务暂时无法加载</Card.Title>
          <Card.Description>请稍后重试，未完成的操作不会被提交。</Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button onPress={reset}>重新尝试</Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
